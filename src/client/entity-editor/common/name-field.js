/*
 * Copyright (C) 2016  Ben Ockmore
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

import {Input} from 'react-bootstrap';

import React from 'react';
import ValidationLabel from '../common/validation-label';

/**
 * Presentational component. This component renders a plain text input and a
 * ValidationLabel for a field labelled 'Name'.
 *
 * @param {Object} props - The properties passed to the component.
 * @param {boolean} props.error - Passed to the ValidationLabel within the
 *        component to indicate a validation error.
 * @param {boolean} props.empty - Passed to the ValidationLabel within the
 *        component to indicate that the field is empty.
 * @param {Function} props.onChange - Function to be called when the value in
 *        the wrapped input changes.
 * @returns {Object} a React component containing the rendered input
 */
function NameField({
	empty,
	error,
	onChange,
	...rest
}) {
	const label = (
		<ValidationLabel empty={empty} error={error}>Name</ValidationLabel>
	);

	return (
		<Input label={label} type="text" onChange={onChange} {...rest}/>
	);
}
NameField.displayName = 'NameField';
NameField.propTypes = {
	empty: React.PropTypes.bool,
	error: React.PropTypes.bool,
	onChange: React.PropTypes.func
};
NameField.defaultProps = {
	empty: true,
	error: false,
	onChange: null
};

export default NameField;
