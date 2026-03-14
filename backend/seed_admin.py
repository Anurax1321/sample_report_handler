"""Seed the database with a default admin user.

Usage:
    python seed_admin.py
    python seed_admin.py --username admin --password admin123
"""
import argparse
import sys

from app.db.session import SessionLocal
from app.db.model import User
from app.core.security import hash_password


def seed_admin(username: str = "admin", password: str = "admin123"):
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.username == username).first()
        if existing:
            print(f"User '{username}' already exists (id={existing.id}). Skipping.")
            return

        user = User(
            username=username,
            hashed_password=hash_password(password),
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"Created user '{username}' (id={user.id})")
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed admin user")
    parser.add_argument("--username", default="admin")
    parser.add_argument("--password", default="admin123")
    args = parser.parse_args()
    seed_admin(args.username, args.password)
