// node tracker/test/edit.test.mjs
// Checks adding and deleting projects from the page (the Worker's pure helpers).
import { addProject, deleteProject } from '../worker/src/index.js';
import assert from 'node:assert/strict';

const data = { projects: [{ name: 'Lineup', status: 'works' }] };

assert.equal(addProject(data, { name: '  ', status: 'idea' }).error, 'need a name');
assert.equal(addProject(data, { name: 'X', status: 'done' }).error, 'bad status');
assert.equal(addProject(data, { name: 'lineup', status: 'idea' }).error, 'name already used', 'names are unique, any case');

const r = addProject(data, { name: '## New\nthing', status: 'idea', summary: 'one\ntwo', features: 'a; b\nc\n\n', url: '' });
assert.equal(r.project.name, 'New thing', 'heading marks and newlines stripped');
assert.equal(r.project.summary, 'one two');
assert.deepEqual(r.project.features, ['a', 'b', 'c'], 'split on lines and semicolons');
assert.equal(r.project.url, undefined, 'empty fields left out');
assert.match(r.project.added, /^\d{4}-\d\d-\d\d$/);
assert.equal(data.projects.length, 2);

assert.equal(deleteProject(data, 'Nope').error, 'no such project');
assert.equal(deleteProject(data, 'Lineup').name, 'Lineup');
assert.deepEqual(data.projects.map(p => p.name), ['New thing']);

console.log('edit tests passed');
