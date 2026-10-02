'use strict';

/*
 * Hexo 4/5 renders layouts from the selected theme.  The migration project
 * keeps the restored homepage template in layout/index.ejs and installs it
 * just before generation, so npm installs and theme updates do not require
 * editing the original Fluid package.
 */

const fs = require('fs');
const path = require('path');

hexo.extend.filter.register('before_generate', function restoreHomepageLayout() {
  const layoutPath = path.join(this.base_dir, 'layout', 'layout.ejs');
  this.theme.setView('layout.ejs', fs.readFileSync(layoutPath, 'utf8'));

  const templatePath = path.join(this.base_dir, 'layout', 'index.ejs');
  if (fs.existsSync(templatePath)) {
    this.theme.setView('index.ejs', fs.readFileSync(templatePath, 'utf8'));
  }

  const navigationPath = path.join(
    this.base_dir,
    'layout',
    '_partials',
    'header',
    'navigation.ejs'
  );
  if (fs.existsSync(navigationPath)) {
    this.theme.setView(
      '_partials/header/navigation.ejs',
      fs.readFileSync(navigationPath, 'utf8')
    );
  }
});
