module.exports = {
  '*.ts': (filenames) => [
    'tsc -p tsconfig.json --noEmit --emitDeclarationOnly false',
    `eslint --cache --fix ${filenames.join(' ')}`,
  ],
  '*.js': 'eslint --cache --fix',
};
