"""
Database models for BeaverCalc Studio
"""
from datetime import datetime
from typing import Optional

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import JSON, Enum, Index, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .extensions import db


class User(db.Model):
    """User model with role-based access"""
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(unique=True, nullable=False, index=True)
    password_hash: Mapped[Optional[str]] = mapped_column()
    first_name: Mapped[Optional[str]] = mapped_column()
    last_name: Mapped[Optional[str]] = mapped_column()
    role: Mapped[str] = mapped_column(
        Enum("admin", "designer", "checker", "viewer", name="user_roles"),
        default="viewer",
        nullable=False
    )
    is_active: Mapped[bool] = mapped_column(default=True)
    last_login: Mapped[Optional[datetime]] = mapped_column()
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    runs: Mapped[list["Run"]] = relationship(back_populates="user")
    projects: Mapped[list["Project"]] = relationship(back_populates="created_by")

    @property
    def full_name(self) -> str:
        """Get user's full name"""
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        return self.email

    def __repr__(self) -> str:
        return f"<User {self.email}>"


class Project(db.Model):
    """Project model"""
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text)
    client: Mapped[Optional[str]] = mapped_column()
    project_number: Mapped[Optional[str]] = mapped_column(unique=True, index=True)
    status: Mapped[str] = mapped_column(
        Enum("active", "completed", "archived", name="project_status"),
        default="active"
    )
    metadata_: Mapped[Optional[dict]] = mapped_column(JSON, name="metadata")
    created_by_id: Mapped[int] = mapped_column(db.ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    created_by: Mapped["User"] = relationship(back_populates="projects")
    runs: Mapped[list["Run"]] = relationship(back_populates="project")
    files: Mapped[list["File"]] = relationship(back_populates="project")

    def __repr__(self) -> str:
        return f"<Project {self.name}>"


class Calculator(db.Model):
    """Calculator metadata and schema"""
    __tablename__ = "calculators"

    id: Mapped[int] = mapped_column(primary_key=True)
    key: Mapped[str] = mapped_column(unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(nullable=False)
    version: Mapped[str] = mapped_column(nullable=False, default="1.0.0")
    description: Mapped[Optional[str]] = mapped_column(Text)
    category: Mapped[str] = mapped_column(
        Enum("structural", "temporary_works", "geotechnical", "loads", "bridge_specific", name="calculator_categories"),
        nullable=False
    )
    input_schema: Mapped[dict] = mapped_column(JSON, nullable=False)
    output_schema: Mapped[dict] = mapped_column(JSON, nullable=False)
    reference_text: Mapped[Optional[str]] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    runs: Mapped[list["Run"]] = relationship(back_populates="calculator")

    def __repr__(self) -> str:
        return f"<Calculator {self.key} v{self.version}>"


class Run(db.Model):
    """Calculation run model"""
    __tablename__ = "runs"

    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[str] = mapped_column(unique=True, nullable=False, index=True)
    project_id: Mapped[int] = mapped_column(db.ForeignKey("projects.id"), index=True)
    calculator_id: Mapped[int] = mapped_column(db.ForeignKey("calculators.id"), index=True)
    user_id: Mapped[int] = mapped_column(db.ForeignKey("users.id"), index=True)

    # Input/Output data
    inputs: Mapped[dict] = mapped_column(JSON, nullable=False)
    results: Mapped[Optional[dict]] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(
        Enum("pending", "running", "completed", "failed", name="run_status"),
        default="pending",
        index=True
    )
    error_message: Mapped[Optional[str]] = mapped_column(Text)

    # Immutable integrity hash (SHA-256 of inputs+results)
    run_hash: Mapped[Optional[str]] = mapped_column(db.String(64))

    # Metadata
    metadata_: Mapped[Optional[dict]] = mapped_column(JSON, name="metadata")
    started_at: Mapped[Optional[datetime]] = mapped_column()
    completed_at: Mapped[Optional[datetime]] = mapped_column()
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)

    @staticmethod
    def compute_hash(inputs: dict, results: dict) -> str:
        """Compute SHA-256 hash of inputs+results for tamper detection."""
        import hashlib, json
        payload = json.dumps({"inputs": inputs, "results": results}, sort_keys=True, default=str)
        return hashlib.sha256(payload.encode()).hexdigest()

    # Relationships
    project: Mapped["Project"] = relationship(back_populates="runs")
    calculator: Mapped["Calculator"] = relationship(back_populates="runs")
    user: Mapped["User"] = relationship(back_populates="runs")
    files: Mapped[list["File"]] = relationship(back_populates="run")

    # Indexes
    __table_args__ = (
        Index("ix_runs_project_status", "project_id", "status"),
        Index("ix_runs_user_created", "user_id", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<Run {self.run_id} - {self.status}>"


class File(db.Model):
    """File attachment model"""
    __tablename__ = "files"

    id: Mapped[int] = mapped_column(primary_key=True)
    filename: Mapped[str] = mapped_column(nullable=False)
    original_filename: Mapped[str] = mapped_column(nullable=False)
    file_path: Mapped[str] = mapped_column(nullable=False)
    file_type: Mapped[str] = mapped_column(
        Enum("pdf", "docx", "xlsx", "dxf", "image", "other", name="file_types"),
        nullable=False
    )
    file_size: Mapped[int] = mapped_column(nullable=False)
    mime_type: Mapped[str] = mapped_column(nullable=False)
    hash_sha256: Mapped[str] = mapped_column(nullable=False, index=True)

    # Foreign keys
    project_id: Mapped[Optional[int]] = mapped_column(db.ForeignKey("projects.id"), index=True)
    run_id: Mapped[Optional[int]] = mapped_column(db.ForeignKey("runs.id"), index=True)
    uploaded_by_id: Mapped[int] = mapped_column(db.ForeignKey("users.id"))

    # Metadata
    metadata_: Mapped[Optional[dict]] = mapped_column(JSON, name="metadata")
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    # Relationships
    project: Mapped[Optional["Project"]] = relationship(back_populates="files")
    run: Mapped[Optional["Run"]] = relationship(back_populates="files")
    uploaded_by: Mapped["User"] = relationship()

    def __repr__(self) -> str:
        return f"<File {self.filename}>"


class AuditLog(db.Model):
    """Audit log for compliance and tracking"""
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    actor_id: Mapped[int] = mapped_column(db.ForeignKey("users.id"), index=True)
    action: Mapped[str] = mapped_column(nullable=False, index=True)
    resource_type: Mapped[str] = mapped_column(nullable=False)
    resource_id: Mapped[Optional[int]] = mapped_column()
    details: Mapped[Optional[dict]] = mapped_column(JSON)
    ip_address: Mapped[Optional[str]] = mapped_column()
    user_agent: Mapped[Optional[str]] = mapped_column(Text)
    timestamp: Mapped[datetime] = mapped_column(default=datetime.utcnow, index=True)

    # Relationships
    actor: Mapped["User"] = relationship()

    def __repr__(self) -> str:
        return f"<AuditLog {self.action} by {self.actor_id} at {self.timestamp}>"


class Template(db.Model):
    """Reusable calculator input templates"""
    __tablename__ = "templates"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(nullable=False, index=True)
    calculator_key: Mapped[str] = mapped_column(nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text)
    inputs: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_by_id: Mapped[int] = mapped_column(db.ForeignKey("users.id"))
    project_id: Mapped[Optional[int]] = mapped_column(db.ForeignKey("projects.id"), index=True)
    use_count: Mapped[int] = mapped_column(default=0)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    created_by: Mapped["User"] = relationship()
    project: Mapped[Optional["Project"]] = relationship()

    def __repr__(self) -> str:
        return f"<Template {self.name} ({self.calculator_key})>"


class SignOff(db.Model):
    """Report sign-off / approval record"""
    __tablename__ = "sign_offs"

    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[int] = mapped_column(db.ForeignKey("runs.id"), index=True)
    role: Mapped[str] = mapped_column(
        Enum("designer", "checker", "approver", name="signoff_roles"),
        nullable=False,
    )
    user_id: Mapped[int] = mapped_column(db.ForeignKey("users.id"))
    comment: Mapped[Optional[str]] = mapped_column(Text)
    signed_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    # Relationships
    run: Mapped["Run"] = relationship()
    user: Mapped["User"] = relationship()

    __table_args__ = (
        Index("ix_signoff_run_role", "run_id", "role", unique=True),
    )

    def __repr__(self) -> str:
        return f"<SignOff run={self.run_id} role={self.role} by={self.user_id}>"
