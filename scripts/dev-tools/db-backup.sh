#!/bin/bash
#
# Database Backup and Restore Script
# Manages database backups with compression and versioning

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

success() { echo -e "${GREEN}✅ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }
info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

DB_PATH="${DB_PATH:-data/bamboozled.db}"
BACKUP_DIR="${BACKUP_DIR:-backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/bamboozled_$TIMESTAMP.db"

# Create backup directory
mkdir -p "$BACKUP_DIR"

backup_database() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  Database Backup${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    if [ ! -f "$DB_PATH" ]; then
        error "Database not found at: $DB_PATH"
        exit 1
    fi

    info "Backing up database..."
    info "Source: $DB_PATH"
    info "Destination: $BACKUP_FILE"

    # Create backup
    cp "$DB_PATH" "$BACKUP_FILE"

    # Compress backup
    info "Compressing backup..."
    gzip -f "$BACKUP_FILE"
    BACKUP_FILE="$BACKUP_FILE.gz"

    # Get backup size
    backup_size=$(du -h "$BACKUP_FILE" | cut -f1)

    success "Backup created successfully"
    success "File: $BACKUP_FILE"
    success "Size: $backup_size"

    # List recent backups
    echo ""
    info "Recent backups:"
    ls -lht "$BACKUP_DIR" | head -n 6

    # Clean old backups (keep last 10)
    backup_count=$(ls -1 "$BACKUP_DIR"/*.db.gz 2>/dev/null | wc -l)
    if [ "$backup_count" -gt 10 ]; then
        warning "Found $backup_count backups, cleaning old ones (keeping last 10)..."
        ls -t "$BACKUP_DIR"/*.db.gz | tail -n +11 | xargs rm -f
        success "Old backups cleaned"
    fi

    echo ""
}

restore_database() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  Database Restore${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    # List available backups
    info "Available backups:"
    echo ""
    ls -lht "$BACKUP_DIR"/*.db.gz 2>/dev/null || {
        error "No backups found in $BACKUP_DIR"
        exit 1
    }

    echo ""
    echo -e "${YELLOW}Enter backup filename to restore (or 'latest' for most recent):${NC}"
    read -r backup_choice

    # Determine which backup to restore
    if [ "$backup_choice" = "latest" ]; then
        RESTORE_FILE=$(ls -t "$BACKUP_DIR"/*.db.gz 2>/dev/null | head -n1)
    else
        RESTORE_FILE="$BACKUP_DIR/$backup_choice"
    fi

    if [ ! -f "$RESTORE_FILE" ]; then
        error "Backup file not found: $RESTORE_FILE"
        exit 1
    fi

    info "Selected backup: $RESTORE_FILE"

    # Confirm restore
    echo ""
    warning "This will OVERWRITE the current database!"
    echo -e "${YELLOW}Current database: $DB_PATH${NC}"
    echo -e "${YELLOW}Are you sure? (yes/no):${NC}"
    read -r confirmation

    if [ "$confirmation" != "yes" ]; then
        warning "Restore cancelled"
        exit 0
    fi

    # Backup current database before restoring
    if [ -f "$DB_PATH" ]; then
        info "Backing up current database first..."
        PRE_RESTORE_BACKUP="$BACKUP_DIR/pre_restore_$TIMESTAMP.db"
        cp "$DB_PATH" "$PRE_RESTORE_BACKUP"
        gzip -f "$PRE_RESTORE_BACKUP"
        success "Current database backed up to: $PRE_RESTORE_BACKUP.gz"
    fi

    # Decompress and restore
    info "Restoring database..."
    gunzip -c "$RESTORE_FILE" > "$DB_PATH"

    success "Database restored successfully"
    success "Restored from: $RESTORE_FILE"

    # Verify restored database
    if command -v sqlite3 &> /dev/null; then
        info "Verifying database integrity..."
        if sqlite3 "$DB_PATH" "PRAGMA integrity_check;" | grep -q "ok"; then
            success "Database integrity check passed"
        else
            error "Database integrity check failed!"
            warning "You may want to restore from another backup"
        fi
    fi

    echo ""
}

list_backups() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  Available Backups${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    if ls "$BACKUP_DIR"/*.db.gz &>/dev/null; then
        ls -lht "$BACKUP_DIR"/*.db.gz

        # Show total size
        total_size=$(du -sh "$BACKUP_DIR" | cut -f1)
        echo ""
        info "Total backup size: $total_size"
    else
        warning "No backups found in $BACKUP_DIR"
    fi

    echo ""
}

show_help() {
    echo ""
    echo "Database Backup and Restore Tool"
    echo ""
    echo "Usage:"
    echo "  $0 backup          - Create a new backup"
    echo "  $0 restore         - Restore from a backup"
    echo "  $0 list            - List available backups"
    echo ""
    echo "Environment variables:"
    echo "  DB_PATH            - Database file path (default: data/bamboozled.db)"
    echo "  BACKUP_DIR         - Backup directory (default: backups)"
    echo ""
}

# Main command handler
case "${1:-help}" in
    backup)
        backup_database
        ;;
    restore)
        restore_database
        ;;
    list)
        list_backups
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac
