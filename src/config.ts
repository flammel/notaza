import { hasOwnProperty } from './util';

export interface Config {
    user: string;
    repo: string;
    token: string;
}

export function loadConfig(): Promise<Config> {
    const localStorageKey = 'notaza-config';
    const fromLocalStorage = window.localStorage.getItem(localStorageKey);
    if (fromLocalStorage !== null) {
        const jsonFromLocalStorage = JSON.parse(fromLocalStorage) as unknown;
        if (
            typeof jsonFromLocalStorage === 'object' &&
            jsonFromLocalStorage !== null &&
            hasOwnProperty(jsonFromLocalStorage, 'user') &&
            hasOwnProperty(jsonFromLocalStorage, 'repo') &&
            hasOwnProperty(jsonFromLocalStorage, 'token')
        ) {
            const { user, repo, token } = jsonFromLocalStorage;
            if (typeof user === 'string' && typeof repo === 'string' && typeof token === 'string') {
                return Promise.resolve({ user, repo, token });
            }
        }
    }
    const user = window.prompt('user');
    const repo = window.prompt('repo');
    const token = window.prompt('token');

    if (typeof user === 'string' && typeof repo === 'string' && typeof token === 'string') {
        const config = { user, repo, token };
        window.localStorage.setItem(localStorageKey, JSON.stringify(config));
        return Promise.resolve(config);
    } else {
        return Promise.reject('Could not load config');
    }
}
