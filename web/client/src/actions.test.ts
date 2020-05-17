import * as actions from './actions';
import { AppState } from './types';

const oldState: AppState = {
    currentPage: 'p-1',
    editingId: undefined,
    notifications: [],
    pages: [
        {
            id: 'p-1',
            title: 'Page 1',
            url: 'page-1',
            block: {
                id: 'root',
                content: 'Root',
                children: [
                    {
                        id: 'b-1',
                        content: 'Block 1',
                        children: [],
                    },
                    {
                        id: 'b-2',
                        content: 'Block 2',
                        children: [
                            {
                                id: 'b-2-1',
                                content: 'Block 2-1',
                                children: [],
                            },
                            {
                                id: 'b-2-2',
                                content: 'Block 2-2',
                                children: [],
                            },
                        ],
                    },
                ],
            },
        },
    ],
};

describe('splitBlock', () => {
    test('No children adds sibling', () => {
        const action = actions.splitBlock('p-1', 'b-1', 'before', 'after');
        const newState = actions.reduce(oldState, action)
        const newBlockId = newState.editingId;
        expect(newState).toEqual({
            currentPage: 'p-1',
            editingId: newBlockId,
            notifications: [],
            pages: [
                {
                    id: 'p-1',
                    title: 'Page 1',
                    url: 'page-1',
                    block: {
                        id: 'root',
                        content: 'Root',
                        children: [
                            {
                                id: 'b-1',
                                content: 'before',
                                children: [],
                            },
                            {
                                id: newBlockId,
                                content: 'after',
                                children: [],
                            },
                            {
                                id: 'b-2',
                                content: 'Block 2',
                                children: [
                                    {
                                        id: 'b-2-1',
                                        content: 'Block 2-1',
                                        children: [],
                                    },
                                    {
                                        id: 'b-2-2',
                                        content: 'Block 2-2',
                                        children: [],
                                    },
                                ],
                            },
                        ],
                    },
                },
            ],
        });
    });
    test('With children adds child', () => {
        const action = actions.splitBlock('p-1', 'b-2', 'before', 'after');
        const newState = actions.reduce(oldState, action)
        const newBlockId = newState.editingId;
        expect(newState).toEqual({
            currentPage: 'p-1',
            editingId: newBlockId,
            notifications: [],
            pages: [
                {
                    id: 'p-1',
                    title: 'Page 1',
                    url: 'page-1',
                    block: {
                        id: 'root',
                        content: 'Root',
                        children: [
                            {
                                id: 'b-1',
                                content: 'Block 1',
                                children: [],
                            },
                            {
                                id: 'b-2',
                                content: 'before',
                                children: [
                                    {
                                        id: newBlockId,
                                        content: 'after',
                                        children: [],
                                    },
                                    {
                                        id: 'b-2-1',
                                        content: 'Block 2-1',
                                        children: [],
                                    },
                                    {
                                        id: 'b-2-2',
                                        content: 'Block 2-2',
                                        children: [],
                                    },
                                ],
                            },
                        ],
                    },
                },
            ],
        });
    });
});

describe('mergeBlockWithPredecessor', () => {
    test('Merges into parent', () => {
        const action = actions.mergeBlockWithPredecessor('p-1', 'b-2-1', 'c');
        const newState = actions.reduce(oldState, action)
        expect(newState).toEqual({
            currentPage: 'p-1',
            editingId: 'b-2',
            notifications: [],
            pages: [
                {
                    id: 'p-1',
                    title: 'Page 1',
                    url: 'page-1',
                    block: {
                        id: 'root',
                        content: 'Root',
                        children: [
                            {
                                id: 'b-1',
                                content: 'Block 1',
                                children: [],
                            },
                            {
                                id: 'b-2',
                                content: 'Block 2c',
                                children: [
                                    {
                                        id: 'b-2-2',
                                        content: 'Block 2-2',
                                        children: [],
                                    },
                                ],
                            },
                        ],
                    },
                },
            ],
        });
    });
    test('Merges into sibling', () => {
        const action = actions.mergeBlockWithPredecessor('p-1', 'b-2', 'c');
        const newState = actions.reduce(oldState, action)
        expect(newState).toEqual({
            currentPage: 'p-1',
            editingId: 'b-1',
            notifications: [],
            pages: [
                {
                    id: 'p-1',
                    title: 'Page 1',
                    url: 'page-1',
                    block: {
                        id: 'root',
                        content: 'Root',
                        children: [
                            {
                                id: 'b-1',
                                content: 'Block 1c',
                                children: [
                                    {
                                        id: 'b-2-1',
                                        content: 'Block 2-1',
                                        children: [],
                                    },
                                    {
                                        id: 'b-2-2',
                                        content: 'Block 2-2',
                                        children: [],
                                    },
                                ],
                            },
                        ],
                    },
                },
            ],
        });
    });
    test('Does nothing on first child of root', () => {
        const action = actions.mergeBlockWithPredecessor('p-1', 'b-1', 'c');
        const newState = actions.reduce(oldState, action)
        expect(newState).toEqual(oldState);
    });
});
