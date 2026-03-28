# Stagehand MCP Test Roadmap

## Deferred test cases

Some legacy tests were intentionally skipped during suite stabilization because they assert behavior that no longer matches the runtime contract.

### Default alias auto-creation on non-navigate tools

Current runtime behavior:

- `stagehand_navigate` can bootstrap a Stagehand instance.
- Other tools require an existing active instance and should return an error if none exists.

Skipped tests now marked with `TODO` assumed that tools such as `stagehand_act`, `stagehand_observe`, `stagehand_extract`, `screenshot`, `stagehand_capture_screenshot`, `stagehand_copy_as_markdown`, `stagehand_agent_execute`, and `stagehand_mouse_action_at_coordinates` would auto-create a default instance.

## Follow-up options

1. Keep the current runtime contract and rewrite those skipped tests as negative-path assertions.
2. Change product behavior so non-navigate tools can lazily create a default instance, then unskip and rewrite the tests around that contract.
3. Add a small integration suite that boots a fake Stagehand session once and verifies alias lifecycle across multiple tools.
