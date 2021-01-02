// 各種プラグインを読み込む
import resolve from '@rollup/plugin-node-resolve';
import typescript from 'rollup-plugin-typescript2';
import commonjs from '@rollup/plugin-commonjs';
import path from 'path';
import { babel as pluginBabel } from "@rollup/plugin-babel";

import camelCase from "lodash.camelcase";
import upperFirst from "lodash.upperfirst";

import {terser} from 'rollup-plugin-terser';


import pkg from './package.json';

const moduleName = upperFirst(camelCase(pkg.name.replace(/^\@.*\//, '')));

// ライブラリに埋め込むcopyright
const banner = `/*!
  ${moduleName}.js v${pkg.version}
  ${pkg.homepage}
  Released under the ${pkg.license} License.
*/`;


const plugins = [
  resolve(),
  typescript(),
  commonjs({extensions: ['.ts', '.js']}),
]
const indexId = path.resolve(__dirname, './src/index.ts');

const outDir = `./dist`

export default [
  // ブラウザ用設定
  {
    // エントリポイント
    input: 'src/index.ts',
    output: [
      // minifyせずに出力する
      {
        // exportされたモジュールを格納する変数
        name: moduleName,
        // 出力先ファイル
        file: `${outDir}/${pkg.browser}`,
        // ブラウザ用フォーマット
        format: 'iife',
        // ソースマップをインラインで出力
        sourcemap: 'inline',
        // copyright
        banner,
      },
      // minifyして出力する
      {
        name: moduleName,
        // minifyするので.minを付与する
        file: `${outDir}/${pkg.browser}`.replace('.js', '.min.js'),
        format: 'iife',
        banner,
        // minify用プラグインを追加で実行する
        plugins: [
          terser(),
        ],
      },
    ],
    plugins: [
      typescript(),
      commonjs({
        extensions: [".js", ".ts"],
      }),
      pluginBabel({
        babelHelpers: "bundled",
        configFile: path.resolve(__dirname, ".babelrc.js"),
      }),
      resolve({
        browser: true,
      }),
    ],
  },
];