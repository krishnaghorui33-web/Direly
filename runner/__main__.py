"""Command-line entry point for the OrderBot evaluation runner.

    python -m runner                 evaluate all versions
    python -m runner --version B     evaluate one version
    python -m runner --submit        evaluate and POST to the backend
    python -m runner --selfcheck     prove the regression, no database needed

This exists as a thin shim so `python -m runner` works without runpy complaining
that runner/__init__.py already imported the module being executed.
"""

import sys


def main() -> int:
    """Dispatch to the requested runner command.

    Returns:
        int: Process exit code.
    """
    if "--selfcheck" in sys.argv:
        from runner.selfcheck import main as selfcheck_main

        return selfcheck_main()

    if "--submit" in sys.argv:
        # Strip the flag before delegating: submit._cli owns its own parser and
        # would reject an argument it does not define.
        sys.argv.remove("--submit")
        from runner.submit import _cli

        return _cli()

    from runner.evaluator import _cli

    return _cli()


if __name__ == "__main__":
    raise SystemExit(main())