import mix from 'laravel-mix';
import path from 'path';
import fs from 'fs';
import { Component } from 'laravel-mix/src/components/Component';
import { parseAll } from './loader';

class BeforeBuildPlugin {
    callback: Function;

    constructor(callback: Function) {
        this.callback = callback;
    }

    apply(compiler): void {
        compiler.hooks.compile.tap('BeforeBuildPlugin', this.callback);
    }
}

mix.extend('i18n', class extends Component {
    langPath: string;
    context: any;

    register(langPath = 'lang'): void {
        this.langPath = this.context.paths.rootPath + path.sep + langPath;
    }

    webpackConfig(config): void {
        let files = [];

        config.watchOptions = {
            ignored: /php_\w+\.json/,
        };

        config.plugins.push(new BeforeBuildPlugin(() => {
            files = parseAll(this.langPath);
        }))

        this.context.listen('build', () => {
            files.forEach(file => {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });
        });
    }
});
