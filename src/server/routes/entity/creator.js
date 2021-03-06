/*
 * Copyright (C) 2015       Ben Ockmore
 *               2015-2016  Sean Burke
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with this program; if not, write to the Free Software Foundation, Inc.,
 * 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 */

'use strict';

const React = require('react');
const ReactDOMServer = require('react-dom/server');
const express = require('express');
const _ = require('lodash');

const bookbrainzData = require('bookbrainz-data');
const {Creator, CreatorRevision, CreatorHeader} = bookbrainzData;

/* Middleware loader functions. */
const loadCreatorTypes = require('../../helpers/middleware').loadCreatorTypes;
const loadEntityRelationships =
	require('../../helpers/middleware').loadEntityRelationships;
const loadGenders = require('../../helpers/middleware').loadGenders;
const loadIdentifierTypes =
	require('../../helpers/middleware').loadIdentifierTypes;
const loadLanguages = require('../../helpers/middleware').loadLanguages;
const makeEntityLoader = require('../../helpers/middleware').makeEntityLoader;

const auth = require('../../helpers/auth');
const utils = require('../../helpers/utils');

const entityRoutes = require('./entity');

const EditForm = React.createFactory(
	require('../../../client/entity-editor/root-component').default
);

const router = express.Router();

/* If the route specifies a BBID, load the Creator for it. */
router.param(
	'bbid',
	makeEntityLoader(
		Creator,
		['creatorType', 'gender', 'beginArea', 'endArea'],
		'Creator not found'
	)
);

function _setCreatorTitle(res) {
	res.locals.title = utils.createEntityPageTitle(
		res.locals.entity,
		'Creator',
		utils.template`Creator “${'name'}”`
	);
}

router.get('/:bbid', loadEntityRelationships, (req, res) => {
	_setCreatorTitle(res);
	entityRoutes.displayEntity(req, res);
});

router.get('/:bbid/delete', auth.isAuthenticated, (req, res) => {
	_setCreatorTitle(res);
	entityRoutes.displayDeleteEntity(req, res);
});

router.post('/:bbid/delete/handler', auth.isAuthenticatedForHandler,
	(req, res) =>
		entityRoutes.handleDelete(req, res, CreatorHeader, CreatorRevision)
);

router.get('/:bbid/revisions', (req, res, next) => {
	_setCreatorTitle(res);
	entityRoutes.displayRevisions(req, res, next, CreatorRevision);
});

// Creation
router.get('/create', auth.isAuthenticated, loadIdentifierTypes, loadGenders,
	loadLanguages, loadCreatorTypes, (req, res) => {
		const props = {
			creatorTypes: res.locals.creatorTypes,
			genderOptions: res.locals.genders,
			identifierTypes: res.locals.identifierTypes,
			languageOptions: res.locals.languages,
			submissionUrl: '/creator/create/handler'
		};

		const markup = ReactDOMServer.renderToString(EditForm(props));

		res.render('entity/create/create-common', {
			heading: 'Create Creator',
			markup,
			props,
			script: 'creator',
			subheading: 'Add a new Creator to BookBrainz',
			title: 'Add Creator'
		});
	}
);

function getDefaultAliasIndex(aliases) {
	const index = aliases.findIndex((alias) => alias.default);
	return index > 0 ? index : 0;
}

function creatorToFormState(creator) {
	const aliases = creator.aliasSet ?
		creator.aliasSet.aliases.map(({language, ...rest}) => ({
			language: language.id,
			...rest
		})) : [];

	const defaultAliasIndex = getDefaultAliasIndex(aliases);
	const defaultAliasList = aliases.splice(defaultAliasIndex, 1);

	const aliasEditor = {};
	aliases.forEach((alias) => { aliasEditor[alias.id] = alias; });

	const buttonBar = {
		aliasEditorVisible: false,
		disambiguationVisible: Boolean(creator.disambiguation),
		identifierEditorVisible: false
	};

	const nameSection = _.isEmpty(defaultAliasList) ? {
		language: null,
		name: '',
		sortName: ''
	} : defaultAliasList[0];
	nameSection.disambiguation =
		creator.disambiguation && creator.disambiguation.comment;

	const identifiers = creator.identifierSet ?
		creator.identifierSet.identifiers.map(({type, ...rest}) => ({
			type: type.id,
			...rest
		})) : [];

	const identifierEditor = {};
	identifiers.forEach(
		(identifier) => { identifierEditor[identifier.id] = identifier; }
	);

	const creatorSection = {
		beginDate: creator.beginDate,
		endDate: creator.endDate,
		ended: creator.ended,
		gender: creator.gender && creator.gender.id,
		type: creator.creatorType && creator.creatorType.id
	};

	return {
		aliasEditor,
		buttonBar,
		creatorSection,
		identifierEditor,
		nameSection
	};
}


router.get('/:bbid/edit', auth.isAuthenticated, loadIdentifierTypes,
	loadGenders, loadLanguages, loadCreatorTypes, (req, res) => {
		const creator = res.locals.entity;

		const props = {
			creator,
			creatorTypes: res.locals.creatorTypes,
			genderOptions: res.locals.genders,
			identifierTypes: res.locals.identifierTypes,
			initialState: creatorToFormState(creator),
			languageOptions: res.locals.languages,
			submissionUrl: `/creator/${creator.bbid}/edit/handler`
		};

		const markup = ReactDOMServer.renderToString(EditForm(props));

		res.render('entity/create/create-common', {
			heading: 'Edit Creator',
			markup,
			props,
			script: 'creator',
			subheading: 'Edit an existing Creator in BookBrainz',
			title: 'Edit Creator'
		});
	}
);

const additionalCreatorProps = [
	'typeId', 'genderId', 'beginAreaId', 'beginDate', 'endDate', 'ended',
	'endAreaId'
];


function transformNewForm(data) {
	let aliases = _.map(data.aliasEditor, ({language, name, sortName}) => ({
		default: false,
		languageId: language,
		name,
		sortName
	}));

	aliases = [{
		default: true,
		languageId: data.nameSection.language,
		name: data.nameSection.name,
		primary: true,
		sortName: data.nameSection.sortName
	}, ...aliases];

	const identifiers = _.map(data.identifierEditor, ({type, ...rest}) => ({
		typeId: type,
		...rest
	}));

	return {
		aliases,
		beginDate: data.creatorSection.beginDate,
		disambiguation: data.nameSection.disambiguation,
		endDate: data.creatorSection.ended ? data.creatorSection.endDate : '',
		ended: data.creatorSection.ended,
		genderId: data.creatorSection.gender,
		identifiers,
		typeId: data.creatorSection.type
	};
}

router.post('/create/handler', auth.isAuthenticatedForHandler, (req, res) => {
	req.body = transformNewForm(req.body);
	return entityRoutes.createEntity(
		req, res, 'Creator', _.pick(req.body, additionalCreatorProps)
	);
});

router.post('/:bbid/edit/handler', auth.isAuthenticatedForHandler,
	(req, res) => {
		req.body = transformNewForm(req.body);
		return entityRoutes.editEntity(
			req, res, 'Creator', _.pick(req.body, additionalCreatorProps)
		);
	}
);

module.exports = router;
