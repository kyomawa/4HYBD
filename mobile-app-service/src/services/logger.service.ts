/**
 * Niveaux de log
 */
export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

/**
 * Configuration du logger
 */
interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  enableStorage: boolean;
  maxStoredLogs: number;
}

/**
 * Entry de log
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  data?: any;
}

/**
 * Configuration par défaut du logger
 */
const DEFAULT_CONFIG: LoggerConfig = {
  minLevel: LogLevel.INFO,
  enableConsole: true,
  enableStorage: true,
  maxStoredLogs: 1000,
};

/**
 * Classe de journalisation pour l'application
 */
export class Logger {
  private static config: LoggerConfig = DEFAULT_CONFIG;
  private static logs: LogEntry[] = [];
  private context: string;

  /**
   * Constructeur du logger
   * @param context Contexte du logger (généralement le nom du service/composant)
   */
  constructor(context: string) {
    this.context = context;
  }

  /**
   * Configurer le logger global
   * @param config Configuration du logger
   */
  static configure(config: Partial<LoggerConfig>): void {
    Logger.config = { ...Logger.config, ...config };
  }

  /**
   * Obtenir tous les logs stockés
   */
  static getLogs(): LogEntry[] {
    return [...Logger.logs];
  }

  /**
   * Effacer tous les logs stockés
   */
  static clearLogs(): void {
    Logger.logs = [];
  }

  /**
   * Exporter tous les logs au format JSON
   */
  static exportLogs(): string {
    return JSON.stringify(Logger.logs);
  }

  /**
   * Log de niveau DEBUG
   * @param message Message à logger
   * @param data Données supplémentaires
   */
  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * Log de niveau INFO
   * @param message Message à logger
   * @param data Données supplémentaires
   */
  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * Log de niveau WARN
   * @param message Message à logger
   * @param data Données supplémentaires
   */
  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * Log de niveau ERROR
   * @param message Message à logger
   * @param data Données supplémentaires
   */
  error(message: string, data?: any): void {
    this.log(LogLevel.ERROR, message, data);
  }

  /**
   * Méthode générique de log
   * @param level Niveau de log
   * @param message Message à logger
   * @param data Données supplémentaires
   */
  private log(level: LogLevel, message: string, data?: any): void {
    // Ne pas logger si le niveau est inférieur au niveau minimum configuré
    if (this.shouldSkip(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      message,
      data,
    };

    // Logger dans la console si activé
    if (Logger.config.enableConsole) {
      this.logToConsole(entry);
    }

    // Stocker le log si activé
    if (Logger.config.enableStorage) {
      this.storeLog(entry);
    }
  }

  /**
   * Détermine si un niveau de log doit être ignoré
   * @param level Niveau de log
   */
  private shouldSkip(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const configLevelIndex = levels.indexOf(Logger.config.minLevel);
    const currentLevelIndex = levels.indexOf(level);

    return currentLevelIndex < configLevelIndex;
  }

  /**
   * Logger dans la console
   * @param entry Entry de log
   */
  private logToConsole(entry: LogEntry): void {
    const formattedMessage = `[${entry.timestamp}] [${entry.level}] [${entry.context}] ${entry.message}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage, entry.data || "");
        break;
      case LogLevel.INFO:
        console.info(formattedMessage, entry.data || "");
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage, entry.data || "");
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage, entry.data || "");
        break;
    }
  }

  /**
   * Stocker un log dans la mémoire
   * @param entry Entry de log
   */
  private storeLog(entry: LogEntry): void {
    Logger.logs.push(entry);

    // Limiter le nombre de logs stockés
    if (Logger.logs.length > Logger.config.maxStoredLogs) {
      Logger.logs.shift();
    }
  }
}

// Configuration du logger en fonction de l'environnement
if (process.env.NODE_ENV === "production") {
  // En production, on limite les logs aux erreurs et avertissements
  Logger.configure({
    minLevel: LogLevel.WARN,
    enableConsole: true,
  });
} else {
  // En développement, on active tous les logs
  Logger.configure({
    minLevel: LogLevel.DEBUG,
    enableConsole: true,
  });
}

/**
 * Instance par défaut du logger pour les cas d'utilisation généraux
 */
export const logger = new Logger("App");
