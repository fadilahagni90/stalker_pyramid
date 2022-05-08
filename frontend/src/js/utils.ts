import * as $ from 'jquery';
import {template} from "dot";
import "daterangepicker";
import "bootstrap-datepicker";
import "jquery-colorbox";


/**
 * Queries Task data from server
 * 
 * @param options
 */
export function get_task_data(options) {
    'use strict';

    /*
    search_string
     *   A string value containing the query words
     * @param callback
     *   A function that will be called with the retrieved data
     */
    options = $.extend({
        search_string: '',
        callback: function () {},
        project_id: null
    }, options);

    class SearchParam {
        project_id: Number;
    }

    let search_buffer;
    let search_params = new SearchParam();
    let key_value_pair;
    let key;
    let value;
    let i;

    search_params.project_id = options.project_id;

    // iterate over each key value pair

    if (options.search_string.indexOf(':') === -1) {
        if (options.search_string.length < 3) {
            // not finished typing yet
            return;
        }

        search_buffer = options.search_string.split(' ');
        // use a direct search with given words as the task full_path
        $.extend(
            search_params,
            {
                path: search_buffer
            }
        );
    } else {
        // so we have some key value pairs
        search_buffer = options.search_string.split(',');

        let current_pair;
        for (i = 0; i < search_buffer.length; i += 1) {
            current_pair = search_buffer[i];

            if (current_pair.length === 0 || current_pair.indexOf(':') === -1) {
                // not finished typing yet
                continue;
            }

            key_value_pair = search_buffer[i].split(':');

            key = key_value_pair[0];
            value = key_value_pair[1].replace(/[\s]+/, ' ').trim(); //.split(' ');

            if (value === '') {
                // not finished typing yet
                continue;
            }

            // if there is a key expand it
            if (search_params[key] !== undefined) {
                search_params[key].push(value);
            } else {
                search_params[key] = [value];
            }
        }
    }

    $.getJSON('/tasks/', search_params, function (data) {
        let input_source = [];
        let result_count = data.length;
        let max_count = 250;
        for (i = 0; i < Math.min(result_count, max_count); i += 1) {
            input_source.push(data[i].full_path);
        }
        if (result_count > max_count) {
            input_source.push('' + (result_count - max_count) + ' more items...');
        }
        options.callback(input_source);
    });
}

export var units = ['y', 'm', 'w', 'd', 'h', 'min'];

export function get_icon(entity_type) {
    'use strict';
    switch (entity_type) {
    case 'PREV':
        return 'icon-pencil';
    case 'HREV':
        return 'icon-mail-reply-all';
    case 'RTS':
        return 'icon-check-empty';
    case 'CMPL':
        return 'icon-check';
    case 'WIP':
        return 'icon-play';
    case 'WFD':
        return 'icon-circle';
    case 'DREV':
        return 'icon-step-backward';
    case 'OH':
        return 'icon-pause';
    case 'STOP':
        return 'icon-stop';
    case 'asset':
        return 'icon-puzzle-piece';
    case 'dashboard':
        return 'icon-dashboard';
    case 'department':
        return 'icon-group';
    case 'group':
        return 'icon-key';
    case 'project':
        return 'icon-folder-close-alt';
    case 'permission':
        return 'icon-key';
    case 'reference':
        return 'icon-book';
    case 'review':
        return 'icon-comments-alt';
    case 'sequence':
        return 'icon-film';
    case 'shot':
        return 'icon-camera';
    case 'task':
        return 'icon-tasks';
    case 'previs':
        return 'icon-coffee';
    case 'ticket':
        return 'icon-ticket';
    case 'vacation':
        return 'icon-sun';
    case 'version':
        return 'icon-sitemap';
    case 'version_output':
        return 'icon-picture';
    case 'user':
        return 'icon-user';
    case 'resource':
        return 'icon-user';
    case 'daily':
        return 'icon-eye-open';
    case 'report':
        return 'icon-bar-chart';
    case 'budget':
        return 'icon-credit-card';
    case 'timelog':
        return 'icon-calendar';
    default:
        return 'icon-key';
    }
}


/**
 * Creates a chosen field
 * 
 * @param field
 *   field
 * @param url
 *   data url
 * @param data_template
 *   the doT template for the data
 * @param selected_id
 *   a list of integers for pre-selecting items
 * @param chosen_options
 *   Extra options to be attached to chosen options
 */
export function chosen_field_creator(field, url, data_template, selected_id, chosen_options) {
    'use strict';
    // fill field with new json data
    // set the field to updating mode
    field.attr('is_updating', true);

    return $.getJSON(url).then(function (data) {
        console.log('data loaded');
        // remove current data
        field.empty();

        // append new options to the select
        var i, data_count = data.length;
        for (i = 0; i < data_count; i += 1) {

            data[i].selected = '';

            if (data[i].id === selected_id) {
                data[i].selected = 'selected';
            }

            field.append(data_template(data[i]));
        }
        // set the field to normal mode
        field.attr('is_updating', false);
    });
}

export function chosen_searchable_field_creator(field, url, data_template) {
    'use strict';
    // fill field with new json data
    // set the field to updating mode
    field.attr('is_updating', true);


    return $.getJSON(url).then(function (data) {

        // append new ones
        var data_count = data.length;
        // remove current data
         // remove current elements
        field.chosen({
            search_contains: true,
            enable_split_word_search: true
        });

        field.find('option').remove();



        // append a single empty option to the responsible field
        field.append(data_template({'id': "", 'name': ""}));
        for (var i=0; i < data_count; i++){
            field.append(data_template(data[i]));
        }
    });
}

export function chosen_searchable_field_creator_by_data(field, data_template, data) {
    'use strict';
    // fill field with new json data
    // set the field to updating mode
    field.attr('is_updating', true);

    field.chosen({
        search_contains: true,
        enable_split_word_search: true
    });

    field.find('option').remove();

    // append new ones
    var data_count = data.length;
    // append a single empty option to the responsible field
    field.append(data_template({'id': "", 'name': ""}));
    for (var i=0; i < data_count; i++){
        field.append(data_template(data[i]));
    }
    field.trigger('liszt:updated');
}


export function seconds_in_unit(unit) {
    'use strict';
    switch (unit) {
    case 'min':
        return 60;
    case 'h':
        return 3600;
    case 'd':
        return 32400; // TODO: this is not true, please use: stalker.defaults.daily_working_hours
    case 'w':
        return 183600; // TODO: this is not true, please use: stalker.defaults.weekly_working_hours
    case 'm':
        return 734400; // TODO: this is not true, please use: 4 * stalker.defaults.weekly_working_hours
    case 'y':
        return 9573418; // TODO: this is not true, please use: stalker.defaults.yearly_working_days * stalker.defaults.daily_working_hours
    }
    return 0;
}

/**
 * Converts the given work time unit to seconds.
 * 
 * @param timing
 * @param unit
 * @returns {number}
 */
export function to_seconds(timing, unit) {
    'use strict';
    var u_seconds = seconds_in_unit(unit);

    return timing * u_seconds;
}

/**
 * The javascript version of the python function that calculates the least
 * meaningful integer value and a time unit name from the given integer seconds
 * value.
 * 
 * @param seconds
 * @returns {string}
 */
export function meaningful_time(seconds) {
    'use strict';
    seconds = Math.round(seconds);

    if (seconds !== 0) {
        if (seconds % seconds_in_unit('y') === 0) {
            return seconds / seconds_in_unit('y') + ' y';
        } else if (seconds % seconds_in_unit('m') === 0) {
            return seconds / seconds_in_unit('m') + ' m';
        } else if (seconds % seconds_in_unit('w') === 0) {
            return seconds / seconds_in_unit('w') + ' w';
        } else if (seconds % seconds_in_unit('d') === 0) {
            return seconds / seconds_in_unit('d') + ' d';
        } else if (seconds % seconds_in_unit('h') === 0) {
            return seconds / seconds_in_unit('h') + ' h';
        } else if (seconds % seconds_in_unit('min') === 0) {
            return seconds / seconds_in_unit('min') + ' min';
        } else {
            return seconds + ' seconds';
        }
    } else {
        return '0';
    }
}


/**
 * Converts the given seconds value in to a meaning full work time range string
 * 
 * @param seconds
 * @returns {string}
 */
export function convert_seconds_to_time_range(seconds) {
    'use strict';
    if (seconds === 0){

        return '0';
    }
    // year
    var time_range_string = '',
        remainder = 0,
        integer_division = 0,
        current_unit,
        sec_in_unit,
        i;

    for(i = 0; i < units.length; i += 1){
        current_unit = units[i];
        sec_in_unit = seconds_in_unit(current_unit);
        integer_division = Math.floor(seconds / sec_in_unit);
        remainder = seconds % sec_in_unit;
        if(integer_division > 0){
            if (time_range_string !== ''){
                time_range_string += ' ';
            }
            time_range_string += integer_division + ' ' + current_unit;
        }
        seconds = remainder;
    }

    return time_range_string;
}


export function convert_seconds_to_hour(seconds) {
    'use strict';
    if (seconds === 0){
        return '0';
    }
    let f_units = ['h','min'];

    // year
    let time_range_string = '',
        remainder = 0,
        integer_division = 0,
        current_unit,
        sec_in_unit,
        i;

    for(i = 0; i < f_units.length; i += 1){
        current_unit = f_units[i];
        sec_in_unit = seconds_in_unit(current_unit);
        integer_division = Math.floor(seconds / sec_in_unit);
        remainder = seconds % sec_in_unit;
        if(integer_division > 0){
            if (time_range_string !== ''){
                time_range_string += ' ';
            }
            time_range_string += integer_division + ' ' + current_unit;
        }
        seconds = remainder;
    }

    return time_range_string;
}

/**
 * Calculates a time string from the given values
 * 
 * @param time1
 * @param time2
 * @returns {string}
 */
export function meaningful_time_between(time1, time2) {
    'use strict';
    let seconds_between = time1 - time2;
    return meaningful_time(seconds_between);
}

export function page_of(name, code, thumbnail_full_path, update_link) {
    'use strict';
    let sidebar_list = $('#sidebar_list');
    let media_template = template($('#tmpl_sidebar_media').html());
    let dic = {
        'name': name,
        'thumbnail_full_path': thumbnail_full_path,
        'code': code,
        'update_link': update_link
    };

    sidebar_list.append(media_template(dic));
}


/**
 * Appends a new item to the thumbnail list
 *
 * @param options
 *   An object that holds options.
 */
export function append_thumbnail(options) {
    'use strict';
    //
    // adds only one item to the list
    //
    // compile the output item template

    options = $.extend({
        data: null,
        template: null,
        colorbox_params: {},
        animate: false,
        container: null
    }, options);

    let data = options.data;
    let template = options.template;
    let colorbox_params = options.colorbox_params;
    let animate = options.animate;
    let container = options.container;

    // check if there is any video
    data.hires_download_path = data.hires_full_path;
    data.webres_download_path = data.webres_full_path;

    colorbox_params.iframe = false;
    if (data.webres_full_path.search('.webm') !== -1) {
        // it should have video replace the address with video player
        data.webres_full_path = 'video_player?video_full_path=/' + data.webres_full_path;
        colorbox_params.iframe = false;
    }

    let ref_item = $($.parseHTML(template(data)));

    if (animate) {
        ref_item.css({display: 'none'});
    }

    container.append(ref_item);
    if (animate) {
        ref_item.toggle('slow');
    }

    ref_item.find('[data-rel="colorbox"]').colorbox(colorbox_params);
}

/**
 * Removes the thumbnails from list
 */
export let remove_thumbnails = function (options) {
    'use strict';
    options = $.extend({
        container: null
    }, options);
    let container = options.container;
    container.children().remove('*');
    container.colorbox.remove();
};


/**
 * Gets entity thumbnail from server
 * 
 * @param options
 */
export let set_entity_thumbnail = function(options) {
    'use strict';
    options = $.extend({
        url: '',
        default_thumbnail: '',
        dom_element_query: ''
    }, options);

    $.getJSON(options.url, function(data){
        // set the default thumbnail
        let thumbnail_path = options.default_thumbnail;
        if(data.thumbnail_path){
            thumbnail_path = '/' + data.thumbnail_path;
        }
        $(options.dom_element_query).attr('src', thumbnail_path);
    });
};


/**
 * Validates timing values
 * 
 * @param options
 */
export let validate_timing_value = function(options) {
    'use strict';
    let is_valid = true,
        errors = [];
    // set defaults
    options = $.extend({
        value: 1,
        unit: 'min'
    }, options);

    // to be safe
    options.value = parseInt(options.value, 10);

    // check resolution
    if (options.unit === 'min') {
        let fixed_timing_value = parseInt((options.value / 10).toFixed(0)) * 10;
        // need to be multiple of 10
        if (options.value !== fixed_timing_value) {
            is_valid = false;
            errors.push('The minimum timing resolution is 10 minutes');
        }
    }

    // check negative values
    if (options.value <= 0){
        is_valid = false;
        errors.push('Timing value should be a positive integer')
    }

    return {is_valid: is_valid, errors: errors}
};


export function findArrayElement(array, attr_name, attr_value) {
    for (let i = 0; i < array.length; i++) {
        if (array[i][attr_name] === attr_value) {
            return i;
        }
    }
    return -1;
}


export let get_date_range = function (field_name) {

    let date_range_val = $('#' + field_name).daterangepicker().val();
    if (date_range_val){
        let date_range = typeof date_range_val === "string" ? date_range_val.split(' - ') : "";
        let start_date_string = date_range[0].split('/');
        let end_date_string = date_range[1].split('/');

        let start = new Date(
            parseInt(start_date_string[2]),
            parseInt(start_date_string[1]) - 1,
            parseInt(start_date_string[0]),
            0,0,0, 0
        );

        let end = new Date(
            parseInt(end_date_string[2]),
            parseInt(end_date_string[1]) - 1,
            parseInt(end_date_string[0]),
            0,0,0, 0
        );

        return [start, end];
    }
    return [null, null];

};

export let get_date_picker = function (field_name) {
    console.log("get_date_picker: "+field_name);

    let date_picker_val = $('#' + field_name).datepicker().val();
    if (date_picker_val){
        let date_arr = typeof date_picker_val === "string" ? date_picker_val.split('/') : "";
        return new Date(
            parseInt(date_arr[2]),
            parseInt(date_arr[1]) - 1,
            parseInt(date_arr[0]),
            0,0,0, 0
        );
    }
    return null;

};