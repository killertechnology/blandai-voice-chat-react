// src/webpack-context.d.ts

declare interface WebpackRequire {
    context(
      directory: string,
      useSubdirectories?: boolean,
      regExp?: RegExp
    ): {
      keys(): string[];
      (id: string): any;
    };
  }
  
  declare var require: WebpackRequire;
  