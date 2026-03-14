#!/usr/bin/env python3
"""
Database initialization script for BeaverCalc Studio
"""
import os
import secrets

from app import create_app
from beaver_calc.extensions import db
from beaver_calc.models import User
from werkzeug.security import generate_password_hash


def init_db():
    """Initialize database and create default admin user"""
    app, socketio = create_app()

    with app.app_context():
        # Create all tables
        db.create_all()

        # Create default admin user if it doesn't exist
        admin = User.query.filter_by(email='admin@beaverbridges.co.uk').first()
        if not admin:
            password = os.environ.get('ADMIN_DEFAULT_PASSWORD') or secrets.token_urlsafe(16)
            admin = User(
                email='admin@beaverbridges.co.uk',
                password_hash=generate_password_hash(password),
                first_name='Admin',
                last_name='User',
                role='admin'
            )
            db.session.add(admin)
            db.session.commit()
            if os.environ.get('ADMIN_DEFAULT_PASSWORD'):
                print("Created default admin user: admin@beaverbridges.co.uk (password from ADMIN_DEFAULT_PASSWORD env var)")
            else:
                print(f"Created default admin user: admin@beaverbridges.co.uk")
                print(f"Generated password: {password}")
                print("IMPORTANT: Save this password now — it will not be shown again.")
                print("Set ADMIN_DEFAULT_PASSWORD env var to use a fixed password.")

        print("Database initialized successfully!")


if __name__ == '__main__':
    init_db()
