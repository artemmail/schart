const { createBuilder } = require('@angular-devkit/architect');
const { spawn } = require('node:child_process');
const path = require('node:path');

/**
 * Normalize the commands option so we always work with objects.
 * @param {string | { command: string, cwd?: string, env?: Record<string, string> }} entry
 */
function normalizeCommand(entry) {
  if (typeof entry === 'string') {
    return { command: entry };
  }

  return entry;
}

/**
 * Spawns a single command and pipes its output to the current process.
 * Resolves when the command exits. Returns success=false on non-zero exit.
 */
function runCommand(command, context) {
  const cwd = command.cwd
    ? path.resolve(context.workspaceRoot, command.cwd)
    : context.workspaceRoot;

  context.logger.info(`Executing: ${command.command}`);

  return new Promise((resolve) => {
    const child = spawn(command.command, {
      cwd,
      env: { ...process.env, ...(command.env ?? {}) },
      shell: true,
      stdio: 'inherit',
    });

    const terminate = () => child.kill('SIGTERM');
    const cleanupFns = [
      ['SIGINT', terminate],
      ['SIGTERM', terminate],
      ['exit', terminate],
    ].map(([event, handler]) => {
      const fn = () => handler();
      process.on(event, fn);
      return () => process.off(event, fn);
    });

    const handleExit = (code) => {
      cleanupFns.forEach((fn) => fn());
      resolve({ success: code === 0 });
    };

    child.on('error', (error) => {
      context.logger.error(error?.message ?? 'Failed to start command.');
      handleExit(1);
    });

    child.on('exit', handleExit);
  });
}

async function execute(options, context) {
  const commands = (options.commands || []).map(normalizeCommand);

  if (options.parallel) {
    const results = await Promise.all(commands.map((cmd) => runCommand(cmd, context)));
    return { success: results.every((result) => result.success) };
  }

  for (const cmd of commands) {
    const result = await runCommand(cmd, context);
    if (!result.success) {
      return result;
    }
  }

  return { success: true };
}

module.exports = createBuilder(execute);
