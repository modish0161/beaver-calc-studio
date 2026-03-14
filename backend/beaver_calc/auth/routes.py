"""
Authentication routes
"""
import uuid
from datetime import datetime
from typing import Dict, Any

from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token,
    get_jwt_identity,
    jwt_required,
    get_current_user
)
from werkzeug.security import generate_password_hash, check_password_hash

from ..extensions import db
from ..models import User, AuditLog

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/login', methods=['POST'])
def login():
    """Authenticate user and return JWT token"""
    data = request.get_json()

    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email and password required'}), 400

    user = User.query.filter_by(email=data['email']).first()

    if not user or not check_password_hash(user.password_hash or '', data['password']):
        return jsonify({'error': 'Invalid credentials'}), 401

    if not user.is_active:
        return jsonify({'error': 'Account is disabled'}), 401

    # Update last login
    user.last_login = datetime.utcnow()
    db.session.commit()

    # Create access token (flask-jwt-extended 4.x requires string identity)
    access_token = create_access_token(identity=str(user.id))

    # Log successful login
    audit_log = AuditLog(
        actor_id=user.id,
        action='login',
        resource_type='user',
        resource_id=user.id,
        details={'ip_address': request.remote_addr},
        ip_address=request.remote_addr,
        user_agent=request.headers.get('User-Agent')
    )
    db.session.add(audit_log)
    db.session.commit()

    return jsonify({
        'access_token': access_token,
        'user': {
            'id': user.id,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'role': user.role,
            'full_name': user.full_name
        }
    }), 200


@auth_bp.route('/register', methods=['POST'])
@jwt_required()
def register():
    """Register a new user (admin only)"""
    current_user_id = int(get_jwt_identity())
    current_user = User.query.get(current_user_id)

    if current_user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403

    data = request.get_json()

    required_fields = ['email', 'password', 'role']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Email, password, and role required'}), 400

    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already registered'}), 409

    if data['role'] not in ['admin', 'designer', 'checker', 'viewer']:
        return jsonify({'error': 'Invalid role'}), 400

    # Create new user
    user = User(
        email=data['email'],
        password_hash=generate_password_hash(data['password']),
        first_name=data.get('first_name'),
        last_name=data.get('last_name'),
        role=data['role']
    )

    db.session.add(user)
    db.session.commit()

    # Log user creation
    audit_log = AuditLog(
        actor_id=current_user_id,
        action='create_user',
        resource_type='user',
        resource_id=user.id,
        details={'email': user.email, 'role': user.role},
        ip_address=request.remote_addr,
        user_agent=request.headers.get('User-Agent')
    )
    db.session.add(audit_log)
    db.session.commit()

    return jsonify({
        'message': 'User created successfully',
        'user': {
            'id': user.id,
            'email': user.email,
            'role': user.role,
            'full_name': user.full_name
        }
    }), 201


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user_info():
    """Get current user information"""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if not user:
        return jsonify({'error': 'User not found'}), 404

    return jsonify({
        'user': {
            'id': user.id,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'role': user.role,
            'full_name': user.full_name,
            'last_login': user.last_login.isoformat() if user.last_login else None
        }
    }), 200


@auth_bp.route('/users', methods=['GET'])
@jwt_required()
def list_users():
    """List all users (admin only)"""
    current_user_id = int(get_jwt_identity())
    current_user = User.query.get(current_user_id)

    if current_user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403

    users = User.query.all()

    return jsonify({
        'users': [{
            'id': user.id,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'role': user.role,
            'is_active': user.is_active,
            'last_login': user.last_login.isoformat() if user.last_login else None,
            'created_at': user.created_at.isoformat()
        } for user in users]
    }), 200


@auth_bp.route('/users/<int:user_id>', methods=['PUT'])
@jwt_required()
def update_user(user_id):
    """Update user information (admin only)"""
    current_user_id = int(get_jwt_identity())
    current_user = User.query.get(current_user_id)

    if current_user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403

    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json()
    changes = {}

    # Update allowed fields
    if 'first_name' in data:
        user.first_name = data['first_name']
        changes['first_name'] = data['first_name']

    if 'last_name' in data:
        user.last_name = data['last_name']
        changes['last_name'] = data['last_name']

    if 'role' in data:
        if data['role'] not in ['admin', 'designer', 'checker', 'viewer']:
            return jsonify({'error': 'Invalid role'}), 400
        user.role = data['role']
        changes['role'] = data['role']

    if 'is_active' in data:
        user.is_active = data['is_active']
        changes['is_active'] = data['is_active']

    if 'password' in data:
        user.password_hash = generate_password_hash(data['password'])
        changes['password_changed'] = True

    user.updated_at = datetime.utcnow()
    db.session.commit()

    # Log user update
    audit_log = AuditLog(
        actor_id=current_user_id,
        action='update_user',
        resource_type='user',
        resource_id=user.id,
        details=changes,
        ip_address=request.remote_addr,
        user_agent=request.headers.get('User-Agent')
    )
    db.session.add(audit_log)
    db.session.commit()

    return jsonify({
        'message': 'User updated successfully',
        'user': {
            'id': user.id,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'role': user.role,
            'is_active': user.is_active
        }
    }), 200
