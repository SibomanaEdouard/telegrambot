import {MenuTemplate} from 'grammy-inline-menu';
import type {MyContext} from '../../my-context.js';
import {backButtons} from '../general.js';

export const menu = new MenuTemplate<MyContext>(ctx =>
	ctx.t('following-body'),
);


menu.manualRow(backButtons);
