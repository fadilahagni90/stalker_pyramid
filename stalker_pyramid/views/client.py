# -*- coding: utf-8 -*-
# Stalker Pyramid a Web Base Production Asset Management System
# Copyright (C) 2009-2014 Erkan Ozgur Yilmaz
#
# This file is part of Stalker Pyramid.
#
# This library is free software; you can redistribute it and/or
# modify it under the terms of the GNU Lesser General Public
# License as published by the Free Software Foundation;
# version 2.1 of the License.
#
# This library is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
# Lesser General Public License for more details.
#
# You should have received a copy of the GNU Lesser General Public
# License along with this library; if not, write to the Free Software
# Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301 USA


import datetime
from pyramid.httpexceptions import HTTPFound
from pyramid.view import view_config

from stalker import db, Client, User, ClientUser
from stalker.db import DBSession

import transaction

from webob import Response
from stalker_pyramid.views import (get_logged_in_user, logger,
                                   PermissionChecker, milliseconds_since_epoch,
                                   local_to_utc)
from stalker_pyramid.views.role import query_role


@view_config(
    route_name='create_client'
)
def create_client(request):
    """called when adding a new client
    """
    logged_in_user = get_logged_in_user(request)
    utc_now = local_to_utc(datetime.datetime.now())

    came_from = request.params.get('came_from', '/')

    # parameters
    name = request.params.get('name')
    description = request.params.get('description')

    logger.debug('create_client          :')

    logger.debug('name          : %s' % name)
    logger.debug('description   : %s' % description)

    if name and description:

        try:
            new_client = Client(
                name=name,
                description=description,
                created_by=logged_in_user,
                date_created=utc_now,
                date_updated=utc_now
            )

            DBSession.add(new_client)
            # flash success message
            request.session.flash(
                'success:Client <strong>%s</strong> is created '
                'successfully' % name
            )
        except BaseException as e:
            request.session.flash('error: %s' % e)
            HTTPFound(location=came_from)

    else:
        transaction.abort()
        return Response('There are missing parameters', 500)

    return Response(
        'success:Client with name <strong>%s</strong> is created.'
        % name
    )

@view_config(
    route_name='update_client'
)
def update_client(request):
    """called when updating a client
    """
    logged_in_user = get_logged_in_user(request)
    utc_now = local_to_utc(datetime.datetime.now())

    client_id = request.matchdict.get('id', -1)
    client = Client.query.filter_by(id=client_id).first()
    if not client:
        transaction.abort()
        return Response('Can not find a client with id: %s' % client_id, 500)


    # parameters
    name = request.params.get('name')
    description = request.params.get('description')

    logger.debug('create_client          :')

    logger.debug('name          : %s' % name)
    logger.debug('description   : %s' % description)

    if name and description:
        client.name = name
        client.description = description
        client.updated_by = logged_in_user
        client.date_updated = utc_now

        DBSession.add(client)

    else:
        transaction.abort()
        return Response('There are missing parameters', 500)

    request.session.flash(
        'success:Client <strong>%s</strong> is updated '
        'successfully' % name
    )

    return Response(
        'success:Client with name <strong>%s</strong> is updated.'
        % name
    )


@view_config(
    route_name='get_clients',
    renderer='json'
)
@view_config(
    route_name='get_studio_clients',
    renderer='json'
)
def get_studio_clients(request):
    """returns client with the given id
    """

    logger.debug('get_studio_clients is working for the studio')

    sql_query = """
         select
            "Clients".id,
            "Client_SimpleEntities".name,
            "Client_SimpleEntities".description,
            "Thumbnail_Links".full_path,
            projects.project_count
        from "Clients"
        join "SimpleEntities" as "Client_SimpleEntities" on "Client_SimpleEntities".id = "Clients".id
        left outer join "Links" as "Thumbnail_Links" on "Client_SimpleEntities".thumbnail_id = "Thumbnail_Links".id
        left outer join  (
            select "Projects".client_id as client_id,
                    count("Projects".id) as project_count
                from "Projects"
                group by "Projects".client_id)as projects on projects.client_id = "Clients".id
    """

    clients = []

    result = db.DBSession.connection().execute(sql_query)
    update_client_permission = \
        PermissionChecker(request)('Update_Client')

    for r in result.fetchall():
        client = {
            'id': r[0],
            'name': r[1],
            'description': r[2],
            'thumbnail_full_path': r[3],
            'projectsCount': r[4] if r[4] else 0
        }
        if update_client_permission:
            client['item_update_link'] = \
                '/clients/%s/update/dialog' % client['id']
            client['item_remove_link'] =\
                '/clients/%s/delete/dialog?came_from=%s' % (
                    client['id'],
                    request.current_route_path()
                )

        clients.append(client)

    resp = Response(
        json_body=clients
    )

    return resp


@view_config(
    route_name='append_user_to_client_dialog',
    renderer='templates/client/dialog/append_user_to_client_dialog.jinja2'
)
def append_user_to_client_dialog(request):
    """called when appending user to client
#     """

    logged_in_user = get_logged_in_user(request)
    came_from = request.params.get('came_from', '/')

    client_id = request.matchdict.get('id', -1)
    client = Client.query.filter(Client.id == client_id).first()
    if not client:
        transaction.abort()
        return Response('Can not find a client with id: %s' % client_id, 500)

    return {
        'has_permission': PermissionChecker(request),
        'logged_in_user': logged_in_user,
        'client': client,
        'came_from':came_from,
        'milliseconds_since_epoch': milliseconds_since_epoch
    }


@view_config(
    route_name='get_client_users_out_stack',
    renderer='json'
)
def get_client_users_out_stack(request):

    logger.debug('get_client_users_out_stack is running')

    client_id = request.matchdict.get('id', -1)
    client = Client.query.filter_by(id=client_id).first()
    if not client:
        transaction.abort()
        return Response('Can not find a client with id: %s' % client_id, 500)

    sql_query = """
        select
            "User_SimpleEntities".name,
            "User_SimpleEntities".id
        from "Users"
        left outer join "Client_Users" on "Client_Users".uid = "Users".id
        join "SimpleEntities" as "User_SimpleEntities" on "User_SimpleEntities".id = "Users".id

        where "Client_Users".cid != %(client_id)s or "Client_Users".cid is Null
    """

    sql_query = sql_query % {'client_id': client_id}
    result = db.DBSession.connection().execute(sql_query)

    users = []
    for r in result.fetchall():
        user = {
            'name': r[0],
            'id': r[1]
        }
        users.append(user)

    resp = Response(
        json_body=users
    )

    return resp


@view_config(
    route_name='append_user_to_client'
)
def append_user_to_client(request):

    logged_in_user = get_logged_in_user(request)
    utc_now = local_to_utc(datetime.datetime.now())

    came_from = request.params.get('came_from', '/')

    client_id = request.matchdict.get('id', -1)
    client = Client.query.filter(Client.id == client_id).first()
    if not client:
        transaction.abort()
        return Response('Can not find a client with id: %s' % client_id, 500)

    user_id = request.params.get('user_id', -1)
    user = User.query.filter(User.id == user_id).first()
    if not user:
        transaction.abort()
        return Response('Can not find a user with id: %s' % user_id, 500)

    role_name = request.params.get('role_name', None)
    role = query_role(role_name)
    role.updated_by = logged_in_user
    role.date_created = utc_now

    logger.debug("%s role is created" % role.name)
    logger.debug(client.users)

    client_user = ClientUser()
    client_user.client = client
    client_user.role = role
    client_user.user = user
    client_user.date_created = utc_now
    client_user.created_by = logged_in_user

    DBSession.add(client_user)

    if user not in client.users:
        client.users.append(user)
        request.session.flash('success:%s is added to %s user list' % (user.name, client.name))

    logger.debug(client.users)

    return Response(
        'success:%s is added to %s.'
        % (user.name, client.name)
    )

@view_config(
    route_name='get_client_users',
    renderer='json'
)
def get_client_users(request):
    """get_client_users
    """
# if there is an id it is probably a project
    client_id = request.matchdict.get('id')
    client = Client.query.filter(Client.id == client_id).first()

    has_permission = PermissionChecker(request)
    has_update_user_permission = has_permission('Update_User')
    has_delete_user_permission = has_permission('Delete_User')

    delete_user_action = '/users/%(id)s/delete/dialog'
    return_data = []
    for user in client.users:
        client_user = ClientUser.query.filter(ClientUser.user == user).first()
        return_data.append(
            {
                'id': user.id,
                'name': user.name,
                'login': user.login,
                'email': user.email,
                'role': client_user.role.name,
                'update_user_action': '/users/%s/update/dialog' % user.id if has_update_user_permission else None,
                'delete_user_action': delete_user_action % {
                    'id': user.id, 'entity_id': client_id
                } if has_delete_user_permission else None
            }
        )

    return return_data


def get_report_template(client):
    """returns the report_template attribute generated by using the given
    client value

    :param stalker.Client client: The client instance
    """
    # use the client.generic_text attribute
    # load JSON data
    # return the report_template attribute

    from stalker import Client
    if not isinstance(client, Client):
        raise TypeError(
            'Please supply a proper stalker.models.client.Client instance for '
            'the client argument and not a %s' % client.__class__.__name__
        )

    import json
    if client.generic_text:
        generic_text = json.loads(
            client.generic_text
        )
        return generic_text.get('report_template', None)


def generate_report(budget, output_path=''):
    """generates report for the given client and budget

    :param stalker.Budget budget: The :class:``stalker.Budget`` instance
    :param str output_path: The output path of the resultant report
    """
    # check the budget argument
    from stalker import Budget
    if not isinstance(budget, Budget):
        raise TypeError(
            'Please supply a proper ``stalker.model.budget.Budget`` instance '
            'for the ``budget`` argument and not %s' %
            budget.__class__.__name__
        )

    # render the budget for the given client by using the clients report format
    client = budget.project.client
    if not client:
        raise RuntimeError(
            'The Project has no client, please specify the client of this '
            'project in ``Project.client`` attribute!!'
        )

    # get the report_template
    report_template = get_report_template(client)

    if not report_template:
        raise RuntimeError(
            'The Client has no report_template, please define a '
            '"report_template" value in the Client.generic_text attribute '
            'with proper format (see documentation for the report_template '
            'format)!'
        )

    # load the template as an XLSX file for now (later expand it to other
    # formats like PDF - so the client should have different report templates)
    wb_path = report_template['template']['path']

    mapper_data = report_template['mapper']

    # client has a project
    # the project has a budget which is given
    # the budget has BudgetEntries
    # BudgetEntries have a name and then a price
    # Some cells in the excel file can contain multiple BudgetEntries
    # so the definition of a cell content can be a list
    # and the result will be reduced to a value:
    #
    # reduce(lambda x, y: x + y, map(float, ['2000', '323', '123'])

    from stalker import BudgetEntry
    import json

    import openpyxl
    wb = openpyxl.load_workbook(wb_path)

    # iterate through sheet_data on the mapper
    for sheet_data in mapper_data['sheets']:
        sheet_name = sheet_data['name']
        logger.debug('sheet_name: %s' % sheet_name)
        sheet = wb.get_sheet_by_name(sheet_name)

        # iterate through cells
        cells = sheet_data['cells']
        logger.debug('cells: %s' % cells)
        for cell_name in cells.keys():
            logger.debug('cell_name: %s' % cell_name)
            cell_data = cells[cell_name]

            result_buffer = []
            for entity_data in cell_data:
                # get the query data
                query_data = entity_data['query']
                result_template = entity_data['result']

                # build the query
                q = BudgetEntry.query\
                    .filter(BudgetEntry.budget == budget)
                for k, v in query_data.items():
                    q = q.filter(getattr(BudgetEntry, k) == v)
                filtered_entity = q.first()

                if filtered_entity:
                    # add secondary data like stoppage_ratio
                    if filtered_entity.generic_text:
                        fe_generic_data = \
                            json.loads(filtered_entity.generic_text)
                        # TODO: Generalize this
                        filtered_entity.stoppage_ratio = \
                            fe_generic_data.get('stoppage_ratio', 0)

                    # now generate the result
                    result_buffer.append(
                        float(
                            eval(result_template.format(item=filtered_entity))
                        )
                    )

            logger.debug('result_buffer: %s' % result_buffer)
            # we should have something like ['2334.3', '2656.4', ...]
            # render it to a one float value
            cell_result = reduce(
                lambda x, y: x + y,
                result_buffer
            )

            # write it down to the cell itself
            sheet[cell_name] = cell_result

    # we should have filled all the data to cells
    # now write it down to the given path
    wb.save(filename=output_path)


def get_distinct_report_templates():
    """returns distinct report templates from all clients
    """
    report_templates = []

    for c in Client.query.all():
        report_template = get_report_template(c)
        if report_template:
            new_report_template = True
            for r in report_templates:
                if report_template['name'] == r['name']:
                    new_report_template = False

            if new_report_template:
                report_templates.append(report_template)

    return report_templates


def get_report_template_by_name(name):
    """returns the report template from all clients that matches the given name
    """
    for rt in get_distinct_report_templates():
        if rt and rt['name'] == name:
            return rt
