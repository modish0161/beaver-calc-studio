"""
WebSocket event handlers for real-time calculation streaming.

Clients can subscribe to a run's room to receive progress events:
  - 'subscribe_run' { run_id }  → join room  run:<run_id>
  - 'unsubscribe_run' { run_id } → leave room

Server emits into the room:
  - 'run_progress' { run_id, status, progress, message }
  - 'run_completed' { run_id, status, results_summary }
  - 'run_failed'    { run_id, error }
"""
from flask_socketio import emit, join_room, leave_room
from flask_jwt_extended import decode_token


def register_events(socketio):
    """Attach SocketIO event handlers."""

    @socketio.on('connect')
    def handle_connect(auth=None):
        """Acknowledge connection."""
        emit('connected', {'message': 'BeaverCalc WebSocket connected'})

    @socketio.on('subscribe_run')
    def handle_subscribe(data):
        """Client joins a room for a specific run."""
        run_id = data.get('run_id')
        if run_id:
            join_room(f'run:{run_id}')
            emit('subscribed', {'run_id': run_id, 'room': f'run:{run_id}'})

    @socketio.on('unsubscribe_run')
    def handle_unsubscribe(data):
        """Client leaves a run room."""
        run_id = data.get('run_id')
        if run_id:
            leave_room(f'run:{run_id}')
            emit('unsubscribed', {'run_id': run_id})

    @socketio.on('disconnect')
    def handle_disconnect():
        pass


def emit_run_progress(socketio, run_id, progress, message=''):
    """Emit progress update into the run's room."""
    socketio.emit('run_progress', {
        'run_id': run_id,
        'progress': progress,
        'message': message,
    }, room=f'run:{run_id}')


def emit_run_completed(socketio, run_id, results_summary):
    """Emit completion into the run's room."""
    socketio.emit('run_completed', {
        'run_id': run_id,
        'status': 'completed',
        'results_summary': results_summary,
    }, room=f'run:{run_id}')


def emit_run_failed(socketio, run_id, error):
    """Emit failure into the run's room."""
    socketio.emit('run_failed', {
        'run_id': run_id,
        'status': 'failed',
        'error': str(error),
    }, room=f'run:{run_id}')
