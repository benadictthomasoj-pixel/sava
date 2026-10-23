import sys
import os
import argparse
import getpass
import re
import uuid
from datetime import datetime, timezone

from app.database import SessionLocal, ensure_schema_compatibility, engine
from app.models import User
from app.security import hash_password


EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
USERNAME_REGEX = re.compile(r"^[a-zA-Z0-9_\-\.]{3,50}$")


def interactive_create_admin(
    username: str = None,
    email: str = None,
    full_name: str = None,
    password: str = None,
    db_session=None,
):
    """
    Creates an initial administrator account securely.
    Uses interactive masked input by default, preventing credentials from appearing
    in shell history, process tables, or persistent logs.
    """
    ensure_schema_compatibility(engine)
    should_close_db = False
    if db_session is not None:
        db = db_session
    else:
        db = SessionLocal()
        should_close_db = True

    try:
        print("\n=== AAYAM Infrastructure Intelligence — Administrator Setup ===")
        print("Create a new administrator account with full system governance rights.\n")

        # Check pre-supplied username
        if username:
            existing = db.query(User).filter(User.username == username).first()
            if existing:
                raise ValueError(f"An account with username '{username}' already exists.")

        # 1. Username
        while not username:
            try:
                raw_user = input("Enter admin username (3-50 chars, alphanumeric/_-): ").strip()
            except (KeyboardInterrupt, EOFError):
                print("\nOperation cancelled.")
                sys.exit(1)

            if not USERNAME_REGEX.match(raw_user):
                print("Invalid username. Must be 3-50 characters consisting of letters, digits, '.', '-', or '_'.")
                continue
            
            existing = db.query(User).filter(User.username == raw_user).first()
            if existing:
                print(f"Error: An account with username '{raw_user}' already exists.")
                continue
            username = raw_user

        # Check pre-supplied email
        if email:
            existing = db.query(User).filter(User.email == email).first()
            if existing:
                raise ValueError(f"An account with email '{email}' already exists.")

        # 2. Email
        while not email:
            try:
                raw_email = input("Enter admin email address: ").strip().lower()
            except (KeyboardInterrupt, EOFError):
                print("\nOperation cancelled.")
                sys.exit(1)


            if not EMAIL_REGEX.match(raw_email):
                print("Invalid email format. Please enter a valid email (e.g. admin@infra.gov.in).")
                continue

            existing = db.query(User).filter(User.email == raw_email).first()
            if existing:
                print(f"Error: An account with email '{raw_email}' already exists.")
                continue
            email = raw_email

        # 3. Full Name
        while not full_name:
            try:
                raw_name = input("Enter admin full name: ").strip()
            except (KeyboardInterrupt, EOFError):
                print("\nOperation cancelled.")
                sys.exit(1)

            if not raw_name:
                print("Full name cannot be empty.")
                continue
            full_name = raw_name

        # 4. Password (Masked)
        while not password:
            try:
                pwd1 = getpass.getpass("Enter administrator password (minimum 8 characters): ")
            except (KeyboardInterrupt, EOFError):
                print("\nOperation cancelled.")
                sys.exit(1)

            if len(pwd1) < 8:
                print("Password must be at least 8 characters long.")
                continue
            if len(pwd1.encode("utf-8")) > 72:
                print("Password must not exceed 72 bytes.")
                continue

            try:
                pwd2 = getpass.getpass("Confirm administrator password: ")
            except (KeyboardInterrupt, EOFError):
                print("\nOperation cancelled.")
                sys.exit(1)

            if pwd1 != pwd2:
                print("Passwords do not match. Please try again.")
                continue
            password = pwd1

        # 5. Hash & Save
        hashed = hash_password(password)
        admin_id = f"USER-ADM-{uuid.uuid4().hex[:8].upper()}"

        admin_user = User(
            id=admin_id,
            username=username,
            email=email,
            full_name=full_name,
            password_hash=hashed,
            role="admin",
            is_active=True,
            created_at=datetime.now(timezone.utc),
        )

        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)

        print("\n[SUCCESS] Administrator account created successfully!")
        print(f"  User ID   : {admin_user.id}")
        print(f"  Username  : {admin_user.username}")
        print(f"  Email     : {admin_user.email}")
        print(f"  Role      : {admin_user.role}")
        print("  Security  : Password securely hashed using bcrypt (12 salt rounds).\n")
        return admin_user

    except Exception as e:
        db.rollback()
        print(f"\n[ERROR] Failed to create administrator account: {e}", file=sys.stderr)
        raise
    finally:
        if should_close_db:
            db.close()



def main():
    parser = argparse.ArgumentParser(
        prog="python -m app.cli",
        description="AAYAM Administrative Management CLI Utility",
    )
    subparsers = parser.add_subparsers(dest="subcommand", help="Available commands")

    # Command: create-admin
    create_admin_parser = subparsers.add_parser(
        "create-admin",
        help="Interactively create an initial system administrator account",
    )

    args = parser.parse_args()

    if args.subcommand == "create-admin":
        interactive_create_admin()
    else:
        parser.print_help()
        sys.exit(0)


if __name__ == "__main__":
    main()
