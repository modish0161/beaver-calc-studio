"""
Flask extensions initialization
"""
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy

# Database
db = SQLAlchemy()
migrate = Migrate()
