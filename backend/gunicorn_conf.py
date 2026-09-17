# Gunicorn configuration for running the async app in production.
# Uvicorn workers give each process its own asyncio event loop; running several
# of them spreads concurrent streaming and GraphQL load across CPU cores.

import multiprocessing
import os

# Bind to localhost only - nginx sits in front and proxies /api to this port.
bind = os.getenv("BACKEND_BIND", "127.0.0.1:8000")

# Worker count defaults to 2x cores (I/O-bound streaming), overridable via env.
workers = int(os.getenv("WEB_CONCURRENCY", multiprocessing.cpu_count() * 2))

worker_class = "uvicorn.workers.UvicornWorker"

# No request timeout kill for long-lived video streams.
timeout = 0

# Recycle workers periodically to guard against slow resource leaks.
max_requests = 2000
max_requests_jitter = 200
