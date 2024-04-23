import {MenuTemplate} from 'grammy-inline-menu';
import type {MyContext} from '../my-context.js';
import {menu as settingsMenu} from './settings/index.js';

export const menu = new MenuTemplate<MyContext>(ctx =>
	ctx.t('welcome', {name: ctx.from!.first_name}),
);

menu.url({
	text: ' test net',
	url: 'https://test.com',
});

menu.submenu('follow', settingsMenu, {
	text: ctx => '✅' + ctx.t('menu-settings'),
});

