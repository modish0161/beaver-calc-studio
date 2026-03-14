"""
BeaverCalc Studio Backend - Main Flask Application
"""
import os

from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_socketio import SocketIO

from beaver_calc.config import Config
from beaver_calc.api import api_bp
from beaver_calc.api.docs import docs_bp
from beaver_calc.auth import auth_bp
from beaver_calc.extensions import db, migrate
from beaver_calc.calculators import load_calculators
from beaver_calc.events import register_events


def create_app(config_class=Config):
    """Application factory pattern"""
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Ensure database URI is set
    if 'SQLALCHEMY_DATABASE_URI' not in app.config:
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///beaver_calc.db'

    # CORS — restrict to configured origins
    allowed_origins = [o.strip() for o in app.config.get('CORS_ORIGINS', 'http://localhost:3000').split(',')]
    CORS(app, origins=allowed_origins, supports_credentials=True)

    JWTManager(app)
    db.init_app(app)
    migrate.init_app(app, db)

    # Rate limiting
    limiter = Limiter(
        get_remote_address,
        app=app,
        default_limits=[app.config.get('RATELIMIT_DEFAULT', '200 per minute')],
        storage_uri=app.config.get('RATELIMIT_STORAGE_URI', 'memory://'),
    )
    # Stricter limit on auth endpoints
    limiter.limit('10 per minute')(auth_bp)

    # Initialize SocketIO with restricted origins
    socketio = SocketIO(app, cors_allowed_origins=allowed_origins)
    app.extensions['socketio'] = socketio

    # Register WebSocket event handlers
    register_events(socketio)

    # Security headers
    @app.after_request
    def set_security_headers(response):
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response.headers['Content-Security-Policy'] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: blob:; "
            "font-src 'self' data:; "
            "connect-src 'self' ws: wss:;"
        )
        return response

    # Load calculators and initialize database
    with app.app_context():
        # Use migrations in production; fall back to create_all for dev/testing
        migrations_dir = os.path.join(os.path.dirname(__file__), 'migrations')
        if os.path.isdir(migrations_dir):
            from flask_migrate import upgrade
            upgrade(directory=migrations_dir)
        else:
            db.create_all()
        load_calculators()

    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(docs_bp, url_prefix='/api/docs')

    # Health check endpoint
    @app.route('/health')
    def health():
        return {'status': 'healthy', 'service': 'beaver-calc-backend'}

    return app, socketio


if __name__ == '__main__':
    app, socketio = create_app()
    is_dev = os.getenv('FLASK_ENV', 'development') == 'development'
    run_kwargs = dict(
        debug=is_dev,
        host='0.0.0.0',
        port=5000,
    )
    try:
        socketio.run(app, allow_unsafe_werkzeug=is_dev, **run_kwargs)
    except TypeError:
        socketio.run(app, **run_kwargs)
