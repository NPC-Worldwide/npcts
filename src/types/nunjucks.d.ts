declare module 'nunjucks' {
  export class Environment {
    constructor();
    addGlobal(name: string, fn: (...args: any[]) => any): void;
    fromString(src: string): Template;
    renderString(src: string, context: Record<string, any>): string;
  }
  export class Template {
    render(context?: Record<string, any>): string;
  }
}
