#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { BamboozledStack } from '../lib/bamboozled-stack';

const app = new cdk.App();

// Get environment from context or use defaults
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT_ID,
  region: process.env.CDK_DEFAULT_REGION || process.env.AWS_REGION || 'us-east-1',
};

// Main stack for both website and Slack bot
new BamboozledStack(app, 'BamboozledStack', {
  env,
  description: 'Bamboozled Puzzle Game - Web & Slack Bot Infrastructure',
  tags: {
    Project: 'Bamboozled',
    Environment: process.env.ENVIRONMENT || 'production',
    ManagedBy: 'CDK',
  },
});

app.synth();
