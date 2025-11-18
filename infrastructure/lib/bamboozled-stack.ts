import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface BamboozledStackProps extends cdk.StackProps {
  // Optional: custom domain name
  domainName?: string;
  // Enable Slack bot (default: true)
  enableSlack?: boolean;
  // Database instance type (default: t4g.micro for cost savings)
  dbInstanceType?: ec2.InstanceType;
}

export class BamboozledStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: BamboozledStackProps) {
    super(scope, id, props);

    const enableSlack = props?.enableSlack !== false;
    const dbInstanceType = props?.dbInstanceType || ec2.InstanceType.of(
      ec2.InstanceClass.T4G,
      ec2.InstanceSize.MICRO
    );

    // ========================================
    // VPC - Network foundation
    // ========================================
    const vpc = new ec2.Vpc(this, 'BamboozledVPC', {
      maxAzs: 2, // 2 availability zones for high availability
      natGateways: 1, // Single NAT gateway to save costs (use 2 for production HA)
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 28,
          name: 'Database',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    // ========================================
    // RDS PostgreSQL Database
    // ========================================
    const dbSecret = new secretsmanager.Secret(this, 'DBSecret', {
      secretName: 'bamboozled/db-credentials',
      description: 'Bamboozled database credentials',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'bamboozled' }),
        generateStringKey: 'password',
        excludePunctuation: true,
        includeSpace: false,
        passwordLength: 32,
      },
    });

    const dbSecurityGroup = new ec2.SecurityGroup(this, 'DBSecurityGroup', {
      vpc,
      description: 'Security group for Bamboozled database',
      allowAllOutbound: false,
    });

    const database = new rds.DatabaseInstance(this, 'Database', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15,
      }),
      instanceType: dbInstanceType,
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      securityGroups: [dbSecurityGroup],
      credentials: rds.Credentials.fromSecret(dbSecret),
      databaseName: 'bamboozled',
      allocatedStorage: 20,
      maxAllocatedStorage: 100, // Auto-scaling up to 100GB
      backupRetention: cdk.Duration.days(7),
      deleteAutomatedBackups: false,
      deletionProtection: true, // Protect against accidental deletion
      removalPolicy: cdk.RemovalPolicy.SNAPSHOT, // Take snapshot on deletion
      publiclyAccessible: false,
      multiAz: false, // Set to true for production HA (costs more)
    });

    // ========================================
    // Secrets for API Keys
    // ========================================
    const apiKeysSecret = new secretsmanager.Secret(this, 'APIKeysSecret', {
      secretName: 'bamboozled/api-keys',
      description: 'Bamboozled API keys (Anthropic, OpenRouter, Giphy, Slack)',
      secretObjectValue: {
        ANTHROPIC_API_KEY: cdk.SecretValue.unsafePlainText('REPLACE_WITH_YOUR_KEY'),
        OPENROUTER_API_KEY: cdk.SecretValue.unsafePlainText('REPLACE_WITH_YOUR_KEY'),
        GIPHY_API_KEY: cdk.SecretValue.unsafePlainText('REPLACE_WITH_YOUR_KEY'),
        SLACK_BOT_TOKEN: cdk.SecretValue.unsafePlainText(enableSlack ? 'REPLACE_WITH_YOUR_KEY' : ''),
        SLACK_SIGNING_SECRET: cdk.SecretValue.unsafePlainText(enableSlack ? 'REPLACE_WITH_YOUR_KEY' : ''),
        SLACK_APP_TOKEN: cdk.SecretValue.unsafePlainText(enableSlack ? 'REPLACE_WITH_YOUR_KEY' : ''),
      },
    });

    // ========================================
    // ECS Cluster
    // ========================================
    const cluster = new ecs.Cluster(this, 'Cluster', {
      vpc,
      clusterName: 'bamboozled-cluster',
      containerInsights: true, // Enable CloudWatch Container Insights
    });

    // ========================================
    // ECR Repositories for Docker Images
    // ========================================
    const backendRepo = new ecr.Repository(this, 'BackendRepo', {
      repositoryName: 'bamboozled-backend',
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Delete repo on stack deletion
      autoDeleteImages: true,
      imageScanOnPush: true, // Scan images for vulnerabilities
    });

    const frontendRepo = new ecr.Repository(this, 'FrontendRepo', {
      repositoryName: 'bamboozled-frontend',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteImages: true,
      imageScanOnPush: true,
    });

    // ========================================
    // ECS Task Definition (Backend + Frontend)
    // ========================================
    const taskRole = new iam.Role(this, 'TaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      description: 'Role for Bamboozled ECS tasks',
    });

    // Grant task permission to read secrets
    dbSecret.grantRead(taskRole);
    apiKeysSecret.grantRead(taskRole);

    const executionRole = new iam.Role(this, 'ExecutionRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
      ],
    });

    // Grant execution role permission to read secrets
    dbSecret.grantRead(executionRole);
    apiKeysSecret.grantRead(executionRole);

    const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDef', {
      memoryLimitMiB: 2048,
      cpu: 1024,
      taskRole,
      executionRole,
    });

    // Backend container
    const backendContainer = taskDefinition.addContainer('Backend', {
      image: ecs.ContainerImage.fromEcrRepository(backendRepo, 'latest'),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'backend',
        logRetention: logs.RetentionDays.ONE_WEEK,
      }),
      environment: {
        NODE_ENV: 'production',
        PORT: '3001',
        AI_PROVIDER: 'claude', // or 'openrouter'
        ENABLE_SLACK: enableSlack ? 'true' : 'false',
        DATABASE_TYPE: 'postgresql',
      },
      secrets: {
        // Database credentials
        DB_HOST: ecs.Secret.fromSecretsManager(dbSecret, 'host'),
        DB_PORT: ecs.Secret.fromSecretsManager(dbSecret, 'port'),
        DB_USER: ecs.Secret.fromSecretsManager(dbSecret, 'username'),
        DB_PASSWORD: ecs.Secret.fromSecretsManager(dbSecret, 'password'),
        DB_NAME: ecs.Secret.fromSecretsManager(dbSecret, 'dbname'),
        // API Keys
        ANTHROPIC_API_KEY: ecs.Secret.fromSecretsManager(apiKeysSecret, 'ANTHROPIC_API_KEY'),
        OPENROUTER_API_KEY: ecs.Secret.fromSecretsManager(apiKeysSecret, 'OPENROUTER_API_KEY'),
        GIPHY_API_KEY: ecs.Secret.fromSecretsManager(apiKeysSecret, 'GIPHY_API_KEY'),
        ...(enableSlack && {
          SLACK_BOT_TOKEN: ecs.Secret.fromSecretsManager(apiKeysSecret, 'SLACK_BOT_TOKEN'),
          SLACK_SIGNING_SECRET: ecs.Secret.fromSecretsManager(apiKeysSecret, 'SLACK_SIGNING_SECRET'),
          SLACK_APP_TOKEN: ecs.Secret.fromSecretsManager(apiKeysSecret, 'SLACK_APP_TOKEN'),
        }),
      },
      portMappings: [{ containerPort: 3001 }],
      healthCheck: {
        command: ['CMD-SHELL', 'curl -f http://localhost:3001/health || exit 1'],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
        startPeriod: cdk.Duration.seconds(60),
      },
    });

    // Frontend container (Nginx serving React app)
    const frontendContainer = taskDefinition.addContainer('Frontend', {
      image: ecs.ContainerImage.fromEcrRepository(frontendRepo, 'latest'),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'frontend',
        logRetention: logs.RetentionDays.ONE_WEEK,
      }),
      portMappings: [{ containerPort: 80 }],
      healthCheck: {
        command: ['CMD-SHELL', 'curl -f http://localhost/ || exit 1'],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
      },
    });

    // Frontend depends on backend being healthy
    frontendContainer.addContainerDependencies({
      container: backendContainer,
      condition: ecs.ContainerDependencyCondition.HEALTHY,
    });

    // ========================================
    // Application Load Balancer
    // ========================================
    const alb = new elbv2.ApplicationLoadBalancer(this, 'ALB', {
      vpc,
      internetFacing: true,
      loadBalancerName: 'bamboozled-alb',
    });

    const listener = alb.addListener('Listener', {
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
    });

    // ========================================
    // Security Groups
    // ========================================
    const serviceSecurityGroup = new ec2.SecurityGroup(this, 'ServiceSecurityGroup', {
      vpc,
      description: 'Security group for Bamboozled ECS service',
    });

    // Allow ALB to reach service
    serviceSecurityGroup.addIngressRule(
      ec2.Peer.securityGroupId(alb.connections.securityGroups[0].securityGroupId),
      ec2.Port.tcp(80),
      'Allow HTTP from ALB'
    );
    serviceSecurityGroup.addIngressRule(
      ec2.Peer.securityGroupId(alb.connections.securityGroups[0].securityGroupId),
      ec2.Port.tcp(3001),
      'Allow backend port from ALB'
    );

    // Allow service to reach database
    dbSecurityGroup.addIngressRule(
      serviceSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow PostgreSQL from ECS service'
    );

    // ========================================
    // ECS Service
    // ========================================
    const service = new ecs.FargateService(this, 'Service', {
      cluster,
      taskDefinition,
      desiredCount: 1, // Start with 1 task, scale up as needed
      securityGroups: [serviceSecurityGroup],
      assignPublicIp: false, // Tasks run in private subnets
      enableExecuteCommand: true, // Enable ECS Exec for debugging
      circuitBreaker: { rollback: true }, // Auto-rollback on deployment failure
      healthCheckGracePeriod: cdk.Duration.seconds(60),
    });

    // Auto-scaling
    const scaling = service.autoScaleTaskCount({
      minCapacity: 1,
      maxCapacity: 10,
    });

    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    scaling.scaleOnMemoryUtilization('MemoryScaling', {
      targetUtilizationPercent: 80,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    // ========================================
    // Target Groups & Routing
    // ========================================
    const frontendTarget = listener.addTargets('Frontend', {
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [
        service.loadBalancerTarget({
          containerName: 'Frontend',
          containerPort: 80,
        }),
      ],
      healthCheck: {
        path: '/',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
      },
      deregistrationDelay: cdk.Duration.seconds(30),
    });

    // Add backend target group for API routes
    const backendTarget = new elbv2.ApplicationTargetGroup(this, 'BackendTarget', {
      vpc,
      port: 3001,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [
        service.loadBalancerTarget({
          containerName: 'Backend',
          containerPort: 3001,
        }),
      ],
      healthCheck: {
        path: '/health',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
      },
      deregistrationDelay: cdk.Duration.seconds(30),
    });

    // Route /api/* to backend
    listener.addAction('APIRouting', {
      priority: 10,
      conditions: [elbv2.ListenerCondition.pathPatterns(['/api/*', '/ws'])],
      action: elbv2.ListenerAction.forward([backendTarget]),
    });

    // ========================================
    // Outputs
    // ========================================
    new cdk.CfnOutput(this, 'LoadBalancerDNS', {
      value: alb.loadBalancerDnsName,
      description: 'Application Load Balancer DNS name',
      exportName: 'BamboozledALBDNS',
    });

    new cdk.CfnOutput(this, 'WebsiteURL', {
      value: `http://${alb.loadBalancerDnsName}`,
      description: 'Bamboozled website URL',
    });

    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: database.dbInstanceEndpointAddress,
      description: 'RDS database endpoint',
    });

    new cdk.CfnOutput(this, 'DatabaseSecretArn', {
      value: dbSecret.secretArn,
      description: 'ARN of database credentials secret',
    });

    new cdk.CfnOutput(this, 'APIKeysSecretArn', {
      value: apiKeysSecret.secretArn,
      description: 'ARN of API keys secret',
    });

    new cdk.CfnOutput(this, 'BackendRepoURI', {
      value: backendRepo.repositoryUri,
      description: 'ECR repository URI for backend',
      exportName: 'BamboozledBackendRepoURI',
    });

    new cdk.CfnOutput(this, 'FrontendRepoURI', {
      value: frontendRepo.repositoryUri,
      description: 'ECR repository URI for frontend',
      exportName: 'BamboozledFrontendRepoURI',
    });

    new cdk.CfnOutput(this, 'ClusterName', {
      value: cluster.clusterName,
      description: 'ECS cluster name',
    });

    new cdk.CfnOutput(this, 'ServiceName', {
      value: service.serviceName,
      description: 'ECS service name',
    });
  }
}
