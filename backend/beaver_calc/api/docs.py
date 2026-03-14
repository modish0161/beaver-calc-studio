"""
OpenAPI specification and Swagger UI for BeaverCalc Studio API
"""
from flask import Blueprint, jsonify, render_template_string

docs_bp = Blueprint('docs', __name__)

OPENAPI_SPEC = {
    "openapi": "3.0.3",
    "info": {
        "title": "BeaverCalc Studio API",
        "version": "1.0.0",
        "description": "Structural Engineering Calculations Platform — REST API for managing projects, running calculations, and generating reports.",
        "contact": {"name": "Beaver Bridges Engineering", "email": "admin@beaverbridges.co.uk"},
    },
    "servers": [{"url": "/", "description": "Current server"}],
    "components": {
        "securitySchemes": {
            "BearerAuth": {
                "type": "http",
                "scheme": "bearer",
                "bearerFormat": "JWT",
            }
        },
        "schemas": {
            "Error": {
                "type": "object",
                "properties": {"error": {"type": "string"}},
            },
            "LoginRequest": {
                "type": "object",
                "required": ["email", "password"],
                "properties": {
                    "email": {"type": "string", "format": "email"},
                    "password": {"type": "string"},
                },
            },
            "LoginResponse": {
                "type": "object",
                "properties": {
                    "access_token": {"type": "string"},
                    "user": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "integer"},
                            "email": {"type": "string"},
                            "first_name": {"type": "string"},
                            "last_name": {"type": "string"},
                            "role": {"type": "string", "enum": ["admin", "designer", "checker", "viewer"]},
                            "full_name": {"type": "string"},
                        },
                    },
                },
            },
            "Project": {
                "type": "object",
                "properties": {
                    "id": {"type": "integer"},
                    "name": {"type": "string"},
                    "description": {"type": "string"},
                    "client": {"type": "string"},
                    "project_number": {"type": "string"},
                    "status": {"type": "string", "enum": ["active", "completed", "archived"]},
                    "created_by": {"type": "string"},
                    "created_at": {"type": "string", "format": "date-time"},
                },
            },
            "CreateProjectRequest": {
                "type": "object",
                "required": ["name"],
                "properties": {
                    "name": {"type": "string"},
                    "description": {"type": "string"},
                    "client": {"type": "string"},
                    "project_number": {"type": "string"},
                },
            },
            "CalculatorMeta": {
                "type": "object",
                "properties": {
                    "key": {"type": "string"},
                    "name": {"type": "string"},
                    "version": {"type": "string"},
                    "description": {"type": "string"},
                    "category": {"type": "string"},
                },
            },
            "CreateRunRequest": {
                "type": "object",
                "required": ["calculator", "project_id", "inputs"],
                "properties": {
                    "calculator": {"type": "string", "description": "Calculator key, e.g. steel_beam_bending_v1"},
                    "project_id": {"type": "integer"},
                    "inputs": {"type": "object", "additionalProperties": True},
                    "metadata": {"type": "object", "additionalProperties": True},
                },
            },
            "SyncRunRequest": {
                "type": "object",
                "required": ["calculator", "inputs", "results"],
                "properties": {
                    "calculator": {"type": "string"},
                    "inputs": {"type": "object", "additionalProperties": True},
                    "results": {"type": "object", "additionalProperties": True},
                    "project_id": {"type": "integer", "nullable": True},
                    "metadata": {"type": "object", "additionalProperties": True},
                },
            },
            "Run": {
                "type": "object",
                "properties": {
                    "id": {"type": "integer"},
                    "run_id": {"type": "string", "format": "uuid"},
                    "project_id": {"type": "integer"},
                    "calculator_key": {"type": "string"},
                    "status": {"type": "string", "enum": ["pending", "running", "completed", "failed"]},
                    "inputs": {"type": "object"},
                    "results": {"type": "object"},
                    "run_hash": {"type": "string", "description": "SHA-256 immutability hash"},
                    "created_at": {"type": "string", "format": "date-time"},
                    "completed_at": {"type": "string", "format": "date-time"},
                },
            },
            "ProjectFile": {
                "type": "object",
                "properties": {
                    "id": {"type": "integer"},
                    "filename": {"type": "string"},
                    "file_type": {"type": "string", "enum": ["pdf", "docx", "xlsx", "dxf", "image", "other"]},
                    "file_size": {"type": "integer"},
                    "mime_type": {"type": "string"},
                    "uploaded_by": {"type": "string"},
                    "created_at": {"type": "string", "format": "date-time"},
                },
            },
            "Template": {
                "type": "object",
                "properties": {
                    "id": {"type": "integer"},
                    "name": {"type": "string"},
                    "calculator_key": {"type": "string"},
                    "description": {"type": "string"},
                    "inputs": {"type": "object"},
                    "use_count": {"type": "integer"},
                    "created_by": {"type": "string"},
                    "created_at": {"type": "string", "format": "date-time"},
                },
            },
            "SignOff": {
                "type": "object",
                "properties": {
                    "id": {"type": "integer"},
                    "role": {"type": "string", "enum": ["designer", "checker", "approver"]},
                    "user": {"type": "string"},
                    "user_id": {"type": "integer"},
                    "comment": {"type": "string"},
                    "signed_at": {"type": "string", "format": "date-time"},
                },
            },
            "AuditLogEntry": {
                "type": "object",
                "properties": {
                    "id": {"type": "integer"},
                    "actor": {"type": "string"},
                    "actor_id": {"type": "integer"},
                    "action": {"type": "string"},
                    "resource_type": {"type": "string"},
                    "resource_id": {"type": "integer"},
                    "details": {"type": "object"},
                    "ip_address": {"type": "string"},
                    "created_at": {"type": "string", "format": "date-time"},
                },
            },
        },
    },
    "security": [{"BearerAuth": []}],
    "paths": {
        # ── Authentication ──────────────────────────────────────────────
        "/auth/login": {
            "post": {
                "tags": ["Authentication"],
                "summary": "Login and obtain JWT token",
                "security": [],
                "requestBody": {"required": True, "content": {"application/json": {"schema": {"$ref": "#/components/schemas/LoginRequest"}}}},
                "responses": {
                    "200": {"description": "Successful login", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/LoginResponse"}}}},
                    "401": {"description": "Invalid credentials", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Error"}}}},
                },
            }
        },
        "/auth/me": {
            "get": {
                "tags": ["Authentication"],
                "summary": "Get current user profile",
                "responses": {"200": {"description": "User profile"}},
            }
        },
        "/auth/register": {
            "post": {
                "tags": ["Authentication"],
                "summary": "Register a new user (admin only)",
                "requestBody": {
                    "required": True,
                    "content": {"application/json": {"schema": {
                        "type": "object",
                        "required": ["email", "password", "role"],
                        "properties": {
                            "email": {"type": "string", "format": "email"},
                            "password": {"type": "string"},
                            "role": {"type": "string", "enum": ["admin", "designer", "checker", "viewer"]},
                            "first_name": {"type": "string"},
                            "last_name": {"type": "string"},
                        },
                    }}},
                },
                "responses": {
                    "201": {"description": "User created"},
                    "403": {"description": "Admin access required"},
                },
            }
        },
        # ── Projects ────────────────────────────────────────────────────
        "/api/projects": {
            "get": {
                "tags": ["Projects"],
                "summary": "List projects (role-filtered)",
                "description": "Admins see all projects; other roles see only their own.",
                "responses": {
                    "200": {"description": "List of projects", "content": {"application/json": {"schema": {"type": "object", "properties": {"projects": {"type": "array", "items": {"$ref": "#/components/schemas/Project"}}}}}}},
                },
            },
            "post": {
                "tags": ["Projects"],
                "summary": "Create a new project",
                "requestBody": {"required": True, "content": {"application/json": {"schema": {"$ref": "#/components/schemas/CreateProjectRequest"}}}},
                "responses": {"201": {"description": "Project created"}},
            },
        },
        "/api/projects/{project_id}": {
            "get": {
                "tags": ["Projects"],
                "summary": "Get a single project by ID",
                "parameters": [{"name": "project_id", "in": "path", "required": True, "schema": {"type": "integer"}}],
                "responses": {
                    "200": {"description": "Project details with run_count and file_count"},
                    "404": {"description": "Project not found"},
                },
            },
            "put": {
                "tags": ["Projects"],
                "summary": "Update a project",
                "parameters": [{"name": "project_id", "in": "path", "required": True, "schema": {"type": "integer"}}],
                "requestBody": {"required": True, "content": {"application/json": {"schema": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "description": {"type": "string"},
                        "client": {"type": "string"},
                        "project_number": {"type": "string"},
                        "status": {"type": "string", "enum": ["active", "completed", "archived"]},
                    },
                }}}},
                "responses": {
                    "200": {"description": "Project updated"},
                    "404": {"description": "Project not found"},
                },
            },
            "delete": {
                "tags": ["Projects"],
                "summary": "Delete a project (admin or creator)",
                "parameters": [{"name": "project_id", "in": "path", "required": True, "schema": {"type": "integer"}}],
                "responses": {
                    "200": {"description": "Project deleted"},
                    "403": {"description": "Insufficient permissions"},
                    "404": {"description": "Project not found"},
                },
            },
        },
        # ── Project Files ───────────────────────────────────────────────
        "/api/projects/{project_id}/files": {
            "get": {
                "tags": ["Project Files"],
                "summary": "List files attached to a project",
                "parameters": [{"name": "project_id", "in": "path", "required": True, "schema": {"type": "integer"}}],
                "responses": {
                    "200": {"description": "List of files", "content": {"application/json": {"schema": {"type": "object", "properties": {"files": {"type": "array", "items": {"$ref": "#/components/schemas/ProjectFile"}}}}}}},
                    "404": {"description": "Project not found"},
                },
            },
            "post": {
                "tags": ["Project Files"],
                "summary": "Upload a file to a project",
                "description": "Accepts drawings, photos, documents. Max 50 MB. Allowed types: pdf, docx, xlsx, dxf, png, jpg, jpeg, dwg.",
                "parameters": [{"name": "project_id", "in": "path", "required": True, "schema": {"type": "integer"}}],
                "requestBody": {"required": True, "content": {"multipart/form-data": {"schema": {"type": "object", "properties": {"file": {"type": "string", "format": "binary"}}}}}},
                "responses": {
                    "201": {"description": "File uploaded"},
                    "400": {"description": "Invalid file type or size"},
                    "404": {"description": "Project not found"},
                },
            },
        },
        "/api/projects/{project_id}/files/{file_id}": {
            "get": {
                "tags": ["Project Files"],
                "summary": "Download a project file",
                "parameters": [
                    {"name": "project_id", "in": "path", "required": True, "schema": {"type": "integer"}},
                    {"name": "file_id", "in": "path", "required": True, "schema": {"type": "integer"}},
                ],
                "responses": {
                    "200": {"description": "File download (Content-Disposition: attachment)"},
                    "404": {"description": "File not found"},
                },
            },
        },
        # ── Calculators ─────────────────────────────────────────────────
        "/api/calculators": {
            "get": {
                "tags": ["Calculators"],
                "summary": "List all available calculators",
                "responses": {
                    "200": {"description": "List of calculators", "content": {"application/json": {"schema": {"type": "object", "properties": {"calculators": {"type": "array", "items": {"$ref": "#/components/schemas/CalculatorMeta"}}}}}}},
                },
            }
        },
        "/api/calculators/{key}": {
            "get": {
                "tags": ["Calculators"],
                "summary": "Get calculator metadata and input schema",
                "parameters": [{"name": "key", "in": "path", "required": True, "schema": {"type": "string"}}],
                "responses": {
                    "200": {"description": "Calculator metadata including input_schema"},
                    "404": {"description": "Calculator not found"},
                },
            }
        },
        # ── Materials & Sections ────────────────────────────────────────
        "/api/materials/steel": {
            "get": {
                "tags": ["Materials & Sections"],
                "summary": "List steel grades (S235, S275, S355, S460)",
                "security": [],
                "responses": {"200": {"description": "Steel grade properties (f_y, f_u, E)"}},
            }
        },
        "/api/materials/concrete": {
            "get": {
                "tags": ["Materials & Sections"],
                "summary": "List concrete grades (C20/25 … C50/60)",
                "security": [],
                "responses": {"200": {"description": "Concrete grade properties (f_ck, f_ctm, E_cm)"}},
            }
        },
        "/api/materials/timber": {
            "get": {
                "tags": ["Materials & Sections"],
                "summary": "List timber grades (C16, C24, D30, GL24h, GL28h)",
                "security": [],
                "responses": {"200": {"description": "Timber grade properties (f_m_k, f_c_0_k, E_0_mean)"}},
            }
        },
        "/api/sections/ukb": {
            "get": {
                "tags": ["Materials & Sections"],
                "summary": "List UKB (Universal Beam) sections",
                "security": [],
                "responses": {"200": {"description": "Section properties (mass, D, B, t_w, t_f, I_y, I_z, W_el_y)"}},
            }
        },
        "/api/sections/ukc": {
            "get": {
                "tags": ["Materials & Sections"],
                "summary": "List UKC (Universal Column) sections",
                "security": [],
                "responses": {"200": {"description": "Section properties"}},
            }
        },
        "/api/sections/pfc": {
            "get": {
                "tags": ["Materials & Sections"],
                "summary": "List PFC (Parallel Flange Channel) sections",
                "security": [],
                "responses": {"200": {"description": "Section properties"}},
            }
        },
        # ── Templates ───────────────────────────────────────────────────
        "/api/templates": {
            "get": {
                "tags": ["Templates"],
                "summary": "List saved input templates",
                "parameters": [{"name": "calculator", "in": "query", "schema": {"type": "string"}, "description": "Filter by calculator key"}],
                "responses": {
                    "200": {"description": "List of templates", "content": {"application/json": {"schema": {"type": "object", "properties": {"templates": {"type": "array", "items": {"$ref": "#/components/schemas/Template"}}}}}}},
                },
            },
            "post": {
                "tags": ["Templates"],
                "summary": "Save calculator inputs as a reusable template",
                "requestBody": {"required": True, "content": {"application/json": {"schema": {
                    "type": "object",
                    "required": ["name", "calculator_key", "inputs"],
                    "properties": {
                        "name": {"type": "string"},
                        "calculator_key": {"type": "string"},
                        "description": {"type": "string"},
                        "inputs": {"type": "object", "additionalProperties": True},
                        "project_id": {"type": "integer", "nullable": True},
                    },
                }}}},
                "responses": {"201": {"description": "Template saved"}},
            },
        },
        "/api/templates/{template_id}": {
            "delete": {
                "tags": ["Templates"],
                "summary": "Delete a template (admin or creator)",
                "parameters": [{"name": "template_id", "in": "path", "required": True, "schema": {"type": "integer"}}],
                "responses": {
                    "200": {"description": "Template deleted"},
                    "403": {"description": "Insufficient permissions"},
                    "404": {"description": "Template not found"},
                },
            },
        },
        "/api/templates/{template_id}/apply": {
            "post": {
                "tags": ["Templates"],
                "summary": "Apply a template (increments use_count, returns inputs)",
                "parameters": [{"name": "template_id", "in": "path", "required": True, "schema": {"type": "integer"}}],
                "responses": {
                    "200": {"description": "Template inputs returned", "content": {"application/json": {"schema": {"type": "object", "properties": {"calculator_key": {"type": "string"}, "inputs": {"type": "object"}}}}}},
                    "404": {"description": "Template not found"},
                },
            },
        },
        # ── Runs ────────────────────────────────────────────────────────
        "/api/runs": {
            "get": {
                "tags": ["Runs"],
                "summary": "List calculation runs",
                "parameters": [
                    {"name": "project_id", "in": "query", "schema": {"type": "integer"}},
                    {"name": "calculator", "in": "query", "schema": {"type": "string"}},
                    {"name": "status", "in": "query", "schema": {"type": "string"}},
                    {"name": "limit", "in": "query", "schema": {"type": "integer", "default": 50}},
                    {"name": "offset", "in": "query", "schema": {"type": "integer", "default": 0}},
                ],
                "responses": {
                    "200": {"description": "Paginated list of runs", "content": {"application/json": {"schema": {"type": "object", "properties": {"runs": {"type": "array", "items": {"$ref": "#/components/schemas/Run"}}, "total": {"type": "integer"}, "limit": {"type": "integer"}, "offset": {"type": "integer"}}}}}},
                },
            },
            "post": {
                "tags": ["Runs"],
                "summary": "Create a new calculation run (server-side compute)",
                "description": "Runs calculation on the server. Emits WebSocket progress events (run:<id>:progress, run:<id>:completed).",
                "requestBody": {"required": True, "content": {"application/json": {"schema": {"$ref": "#/components/schemas/CreateRunRequest"}}}},
                "responses": {
                    "201": {"description": "Run created and completed"},
                    "404": {"description": "Calculator or project not found"},
                    "500": {"description": "Calculation failed"},
                },
            },
        },
        "/api/runs/sync": {
            "post": {
                "tags": ["Runs"],
                "summary": "Store a pre-computed run for audit trail",
                "description": "Accepts inputs + results from the frontend without re-running the calculator. project_id is optional.",
                "requestBody": {"required": True, "content": {"application/json": {"schema": {"$ref": "#/components/schemas/SyncRunRequest"}}}},
                "responses": {
                    "201": {"description": "Run synced successfully"},
                    "404": {"description": "Calculator not found"},
                },
            }
        },
        "/api/runs/{run_id}": {
            "get": {
                "tags": ["Runs"],
                "summary": "Get run details and results",
                "parameters": [{"name": "run_id", "in": "path", "required": True, "schema": {"type": "string", "format": "uuid"}}],
                "responses": {
                    "200": {"description": "Run details", "content": {"application/json": {"schema": {"type": "object", "properties": {"run": {"$ref": "#/components/schemas/Run"}}}}}},
                    "404": {"description": "Run not found"},
                },
            }
        },
        "/api/runs/{run_id}/verify": {
            "get": {
                "tags": ["Runs"],
                "summary": "Verify run integrity (recompute SHA-256 hash)",
                "parameters": [{"name": "run_id", "in": "path", "required": True, "schema": {"type": "string", "format": "uuid"}}],
                "responses": {
                    "200": {"description": "Verification result", "content": {"application/json": {"schema": {"type": "object", "properties": {"verified": {"type": "boolean"}, "run_id": {"type": "string"}, "stored_hash": {"type": "string"}, "computed_hash": {"type": "string"}}}}}},
                    "404": {"description": "Run not found"},
                },
            }
        },
        # ── Reports & Exports ───────────────────────────────────────────
        "/api/runs/{run_id}/report/pdf": {
            "get": {
                "tags": ["Reports & Exports"],
                "summary": "Generate PDF report for a run",
                "parameters": [{"name": "run_id", "in": "path", "required": True, "schema": {"type": "string", "format": "uuid"}}],
                "responses": {
                    "200": {"description": "PDF file", "content": {"application/pdf": {"schema": {"type": "string", "format": "binary"}}}},
                    "404": {"description": "Run not found"},
                },
            }
        },
        "/api/runs/{run_id}/report/docx": {
            "get": {
                "tags": ["Reports & Exports"],
                "summary": "Generate DOCX report for a run",
                "parameters": [{"name": "run_id", "in": "path", "required": True, "schema": {"type": "string", "format": "uuid"}}],
                "responses": {
                    "200": {"description": "DOCX file", "content": {"application/vnd.openxmlformats-officedocument.wordprocessingml.document": {"schema": {"type": "string", "format": "binary"}}}},
                    "404": {"description": "Run not found"},
                },
            }
        },
        "/api/runs/{run_id}/report/dxf": {
            "get": {
                "tags": ["Reports & Exports"],
                "summary": "Generate DXF drawing for a run",
                "description": "Produces a 2D DXF with layers OUTLINE, DIMS, NOTES, HATCHING. Supports pad_footing, hole_pattern, and generic results.",
                "parameters": [{"name": "run_id", "in": "path", "required": True, "schema": {"type": "string", "format": "uuid"}}],
                "responses": {
                    "200": {"description": "DXF file", "content": {"application/dxf": {"schema": {"type": "string", "format": "binary"}}}},
                    "404": {"description": "Run not found"},
                },
            }
        },
        "/api/runs/{run_id}/report/xlsx": {
            "get": {
                "tags": ["Reports & Exports"],
                "summary": "Export run as Excel workbook",
                "description": "Workbook contains sheets: Inputs, Results, Design Checks (if applicable), Summary.",
                "parameters": [{"name": "run_id", "in": "path", "required": True, "schema": {"type": "string", "format": "uuid"}}],
                "responses": {
                    "200": {"description": "XLSX file", "content": {"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {"schema": {"type": "string", "format": "binary"}}}},
                    "404": {"description": "Run not found"},
                },
            }
        },
        # ── Sign-offs ──────────────────────────────────────────────────
        "/api/runs/{run_id}/signoffs": {
            "get": {
                "tags": ["Sign-offs"],
                "summary": "List sign-offs for a run",
                "parameters": [{"name": "run_id", "in": "path", "required": True, "schema": {"type": "string", "format": "uuid"}}],
                "responses": {
                    "200": {"description": "List of sign-offs", "content": {"application/json": {"schema": {"type": "object", "properties": {"signoffs": {"type": "array", "items": {"$ref": "#/components/schemas/SignOff"}}}}}}},
                    "404": {"description": "Run not found"},
                },
            },
            "post": {
                "tags": ["Sign-offs"],
                "summary": "Sign off a run as designer, checker, or approver",
                "description": "Enforces ordering: designer → checker → approver. Role-based permission checks apply.",
                "parameters": [{"name": "run_id", "in": "path", "required": True, "schema": {"type": "string", "format": "uuid"}}],
                "requestBody": {"required": True, "content": {"application/json": {"schema": {
                    "type": "object",
                    "required": ["role"],
                    "properties": {
                        "role": {"type": "string", "enum": ["designer", "checker", "approver"]},
                        "comment": {"type": "string"},
                    },
                }}}},
                "responses": {
                    "201": {"description": "Sign-off recorded"},
                    "400": {"description": "Ordering constraint violated"},
                    "403": {"description": "Insufficient role"},
                    "409": {"description": "Duplicate sign-off"},
                },
            },
        },
        # ── Audit ───────────────────────────────────────────────────────
        "/api/audit": {
            "get": {
                "tags": ["Audit"],
                "summary": "Query audit log (admin/checker only)",
                "parameters": [
                    {"name": "action", "in": "query", "schema": {"type": "string"}, "description": "Filter by action type"},
                    {"name": "resource_type", "in": "query", "schema": {"type": "string"}, "description": "Filter by resource type"},
                    {"name": "limit", "in": "query", "schema": {"type": "integer", "default": 100}},
                    {"name": "offset", "in": "query", "schema": {"type": "integer", "default": 0}},
                ],
                "responses": {
                    "200": {"description": "Paginated audit log entries", "content": {"application/json": {"schema": {"type": "object", "properties": {"audit_logs": {"type": "array", "items": {"$ref": "#/components/schemas/AuditLogEntry"}}, "total": {"type": "integer"}, "limit": {"type": "integer"}, "offset": {"type": "integer"}}}}}},
                    "403": {"description": "Admin or checker access required"},
                },
            }
        },
        # ── System ──────────────────────────────────────────────────────
        "/health": {
            "get": {
                "tags": ["System"],
                "summary": "Health check",
                "security": [],
                "responses": {"200": {"description": "Service healthy"}},
            }
        },
    },
    "tags": [
        {"name": "Authentication", "description": "User login, registration, and profile management"},
        {"name": "Projects", "description": "Project CRUD with role-based access"},
        {"name": "Project Files", "description": "Upload and download project files (drawings, documents, photos)"},
        {"name": "Calculators", "description": "Calculator definitions, schemas, and 95+ structural calculators"},
        {"name": "Materials & Sections", "description": "Steel/concrete/timber grades and UKB/UKC/PFC section catalogues"},
        {"name": "Templates", "description": "Reusable calculator input templates"},
        {"name": "Runs", "description": "Calculation runs — create, list, verify integrity, and retrieve results"},
        {"name": "Reports & Exports", "description": "PDF, DOCX, DXF, and XLSX report/export generation"},
        {"name": "Sign-offs", "description": "Designer → Checker → Approver sign-off workflow"},
        {"name": "Audit", "description": "Immutable audit log query"},
        {"name": "System", "description": "Health and system endpoints"},
    ],
}


SWAGGER_HTML = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>BeaverCalc Studio — API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
    <style>body { margin: 0; } .swagger-ui .topbar { display: none; }</style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
    SwaggerUIBundle({
        url: '/api/docs/openapi.json',
        dom_id: '#swagger-ui',
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
        layout: 'BaseLayout',
        deepLinking: true,
    });
    </script>
</body>
</html>
"""


@docs_bp.route('/openapi.json')
def openapi_spec():
    """Serve the OpenAPI 3.0 specification"""
    return jsonify(OPENAPI_SPEC)


@docs_bp.route('/')
def swagger_ui():
    """Serve Swagger UI"""
    return render_template_string(SWAGGER_HTML)
