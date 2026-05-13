"""Adaptive recommendation tuning (timing, priority, frequency) — separate from HTTP/UI."""

from app.services.adaptive.profile import build_adaptive_context

__all__ = ["build_adaptive_context"]
