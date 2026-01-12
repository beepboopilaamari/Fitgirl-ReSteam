import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import log from 'electron-log';
import { EventEmitter } from 'events';

export interface GameSession {
  installationId: number;
  exePath: string;
  startTime: Date;
  process: ChildProcess;
}

export class GameLauncher extends EventEmitter {
  private activeGames: Map<number, GameSession> = new Map();

  constructor() {
    super();
    log.info('[GameLauncher] Initialized');
  }

  /**
   * Launch a game executable
   */
  async launchGame(installationId: number, exePath: string, runAsAdmin: boolean = true): Promise<boolean> {
    try {
      // Verify executable exists
      if (!fs.existsSync(exePath)) {
        log.error(`[GameLauncher] Executable not found: ${exePath}`);
        this.emit('launch-error', {
          installationId,
          error: 'Executable file not found'
        });
        return false;
      }

      log.info(`[GameLauncher] Launching game: ${exePath} (Admin: ${runAsAdmin})`);

      // Get working directory (game folder)
      const workingDir = path.dirname(exePath);
      const exeName = path.basename(exePath, path.extname(exePath));

      // Launch with admin privileges on Windows
      const isWindows = process.platform === 'win32';

      if (isWindows && runAsAdmin) {
        // Use a VBS script to launch with elevation and show UAC prompt
        const vbsScript = `
Set UAC = CreateObject("Shell.Application")
UAC.ShellExecute "${exePath.replace(/\\/g, '\\\\')}", "", "${workingDir.replace(/\\/g, '\\\\')}", "runas", 1
        `.trim();
        
        const vbsPath = path.join(workingDir, '.launch_elevated.vbs');
        
        try {
          // Write VBS script
          fs.writeFileSync(vbsPath, vbsScript);
          
          // Execute VBS script
          const vbsProcess = spawn('cscript.exe', ['//NoLogo', vbsPath], {
            detached: true,
            stdio: 'ignore',
            shell: false
          });
          
          // Clean up VBS after a short delay
          setTimeout(() => {
            try {
              if (fs.existsSync(vbsPath)) {
                fs.unlinkSync(vbsPath);
              }
            } catch (err) {
              log.error('[GameLauncher] Failed to delete VBS script:', err);
            }
          }, 2000);
          
          vbsProcess.unref();
          
          // Start polling for the elevated process
          this.monitorElevatedProcess(installationId, exeName);
          
          // Emit launch event immediately
          this.emit('game-launched', {
            installationId,
            startTime: new Date()
          });
          
          log.info(`[GameLauncher] Game launched with admin elevation, monitoring process: ${exeName}`);
          return true;
        } catch (error) {
          log.error(`[GameLauncher] Failed to launch with admin:`, error);
          this.emit('launch-error', {
            installationId,
            error: error instanceof Error ? error.message : 'Failed to launch'
          });
          return false;
        }
      }

      // Standard spawn for non-Windows or non-admin
      const gameProcess = spawn(exePath, [], {
        cwd: workingDir,
        detached: true,
        stdio: 'ignore',
        shell: true
      });

      // Store session
      const session: GameSession = {
        installationId,
        exePath,
        startTime: new Date(),
        process: gameProcess
      };

      this.activeGames.set(installationId, session);

      // Emit launch event
      this.emit('game-launched', {
        installationId,
        startTime: session.startTime
      });

      // Handle process exit
      gameProcess.on('exit', (code) => {
        const endTime = new Date();
        const playTimeSeconds = Math.floor((endTime.getTime() - session.startTime.getTime()) / 1000);

        log.info(`[GameLauncher] Game closed. Playtime: ${playTimeSeconds}s`);

        this.emit('game-closed', {
          installationId,
          playTimeSeconds,
          exitCode: code
        });

        this.activeGames.delete(installationId);
      });

      gameProcess.on('error', (error) => {
        log.error(`[GameLauncher] Process error:`, error);
        this.emit('launch-error', {
          installationId,
          error: error.message
        });
        this.activeGames.delete(installationId);
      });

      // Unref so the parent process can exit
      gameProcess.unref();

      return true;
    } catch (error) {
      log.error(`[GameLauncher] Failed to launch game:`, error);
      this.emit('launch-error', {
        installationId,
        error: (error as Error).message
      });
      return false;
    }
  }

  /**
   * Monitor an elevated process by polling for it by name
   */
  private monitorElevatedProcess(installationId: number, exeName: string): void {
    const startTime = new Date();
    let processFound = false;
    
    const checkInterval = setInterval(async () => {
      try {
        const { exec } = require('child_process');
        const util = require('util');
        const execPromise = util.promisify(exec);
        
        // Use tasklist command which doesn't throw on not found
        const { stdout } = await execPromise(
          `tasklist /FI "IMAGENAME eq ${exeName}.exe" /NH`,
          { windowsHide: true }
        );
        
        const isRunning = stdout && stdout.includes(exeName);
        
        if (isRunning && !processFound) {
          // Process just started
          processFound = true;
          log.info(`[GameLauncher] Detected elevated process: ${exeName}`);
        } else if (!isRunning && processFound) {
          // Process has stopped
          const endTime = new Date();
          const playTimeSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
          
          log.info(`[GameLauncher] Elevated game closed. Playtime: ${playTimeSeconds}s`);
          
          this.emit('game-closed', {
            installationId,
            playTimeSeconds,
            exitCode: 0
          });
          
          clearInterval(checkInterval);
        } else if (!isRunning && !processFound) {
          // Process never started (maybe user cancelled UAC?)
          const timeSinceStart = new Date().getTime() - startTime.getTime();
          if (timeSinceStart > 10000) { // 10 seconds timeout
            log.info(`[GameLauncher] Elevated process never detected, assuming cancelled`);
            clearInterval(checkInterval);
          }
        }
      } catch (error) {
        log.error(`[GameLauncher] Error checking elevated process:`, error);
      }
    }, 2000); // Check every 2 seconds
  }

  /**
   * Launch installer executable
   */
  async launchInstaller(installerPath: string): Promise<boolean> {
    try {
      if (!fs.existsSync(installerPath)) {
        log.error(`[GameLauncher] Installer not found: ${installerPath}`);
        return false;
      }

      log.info(`[GameLauncher] Launching installer: ${installerPath}`);

      const workingDir = path.dirname(installerPath);

      // Spawn installer process (not detached, we want to wait for it)
      const installerProcess = spawn(installerPath, [], {
        cwd: workingDir,
        stdio: 'ignore'
      });

      return new Promise((resolve) => {
        installerProcess.on('exit', (code) => {
          log.info(`[GameLauncher] Installer exited with code: ${code}`);
          resolve(code === 0 || code === null);
        });

        installerProcess.on('error', (error) => {
          log.error(`[GameLauncher] Installer error:`, error);
          resolve(false);
        });
      });
    } catch (error) {
      log.error(`[GameLauncher] Failed to launch installer:`, error);
      return false;
    }
  }

  /**
   * Check if a game is currently running
   */
  isGameRunning(installationId: number): boolean {
    return this.activeGames.has(installationId);
  }

  /**
   * Get active game sessions
   */
  getActiveSessions(): GameSession[] {
    return Array.from(this.activeGames.values());
  }

  /**
   * Kill a running game process
   */
  killGame(installationId: number): boolean {
    const session = this.activeGames.get(installationId);
    if (session) {
      try {
        session.process.kill();
        log.info(`[GameLauncher] Killed game process for installation ${installationId}`);
        return true;
      } catch (error) {
        log.error(`[GameLauncher] Failed to kill game process:`, error);
        return false;
      }
    }
    return false;
  }
}
