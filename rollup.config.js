// 各種プラグインを読み込む
import resolve from '@rollup/plugin-node-resolve';
import typescript from 'rollup-plugin-typescript2';
import commonjs from '@rollup/plugin-commonjs';
//import buble from '@rollup/plugin-buble';
//import {terser} from 'rollup-plugin-terser';


import pkg from './package.json';


export default [
  // モジュール用設定
  {
    input: 'src/index.ts',
    output: [
      // CommonJS用出力
      {
        file: pkg.main,
        format: 'cjs',
        sourcemap: 'inline'
      },
      // ESモジュール用出力
      {
        file: pkg.module,
        format: 'es',
        sourcemap: 'inline'
      },
    ],
    // 他モジュールは含めない
    external: [
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.devDependencies || {}),
    ],
    plugins: [
      resolve(),
      typescript(),
      commonjs({extensions: ['.ts', '.js']}),
    ],
  },
];