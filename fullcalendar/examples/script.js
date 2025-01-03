import LitGrade from './LitGrade.js';
import { ApiClient, CalendarSelect, ApiOptions, Input } from '@liturgical-calendar/components-js';
import { Calendar } from '@fullcalendar/core';
import allLocales from '@fullcalendar/core/locales-all';
import dayGridPlugin from '@fullcalendar/daygrid';
import listPlugin from '@fullcalendar/list';
import bootstrap5Plugin from '@fullcalendar/bootstrap5';
import la from './la.js';

Object.filter = (obj, predicate) =>
Object.keys(obj)
    .filter( key => predicate(obj[key]) )
    .reduce( (res, key) => (res[key] = obj[key], res), {} );

Input.setGlobalInputClass('form-select');
Input.setGlobalLabelClass('form-label d-block mb-1');
Input.setGlobalWrapper('div');
Input.setGlobalWrapperClass('form-group col col-md-3');

const currentLocale = Cookies.get('currentLocale') ?? 'en';

let today = new Date(),
    currentYear = today.getFullYear(),
    fullCalendarSettings = {
        locales: allLocales,
        locale: 'en',
        plugins: [ dayGridPlugin, listPlugin, bootstrap5Plugin ],
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,listMonth'
        },
        dayMaxEvents: true,
        firstDay: 0,
        eventOrder: 'idx',
        eventDidMount: info => {
            info.el.title = info.event.extendedProps.description;
            info.el.setAttribute('data-bs-toggle', "tooltip");
            info.el.setAttribute('data-bs-html', "true");
            info.el.setAttribute('data-bs-container', "body");
            info.el.setAttribute('data-bs-custom-class', "custom-tooltip")
            new bootstrap.Tooltip(info.el);
            // Add black outline to white dots when in listMonth view
            const dotEl = info.el.getElementsByClassName('fc-list-event-dot')[0];
            if (dotEl && dotEl.style.borderColor === 'white') {
                dotEl.style.outline = '1px solid black';
            }
        },
        themeSystem: 'bootstrap5'
    },
    pad = n => n < 10 ? '0' + n : n,
    litCalDataToEvents = LitCal => {
        return LitCal.map( (Festivity, index) => {
            Festivity.date = new Date(Festivity.date * 1000);
            const DayOfTheWeek = (Festivity.date.getDay() === 0 ? 7 : Festivity.date.getDay()); // get the day of the week
            const CSScolor = Festivity.color[0];
            const textColor = (CSScolor === 'white' || CSScolor === 'pink' ? 'black' : 'white');
            let festivityGrade = '';
            if (Festivity.hasOwnProperty('grade_display') && Festivity.grade_display !== null) {
                festivityGrade = Festivity.grade_display === '' ? '' : Festivity.grade_display + ', ';
            }
            else if (DayOfTheWeek !== 7 || Festivity.grade > 3) {
                const { tags } = LitGrade.strWTags( Festivity.grade );
                festivityGrade = tags[0] + Festivity.grade_lcl + tags[1] + ', ';
            }
            let description = '<b>' + Festivity.name + '</b><br>' + festivityGrade + '<i>' + Festivity.color_lcl + '</i><br><i style="font-size:.8em;">' + Festivity.common_lcl + '</i>' + (Festivity.hasOwnProperty('liturgical_year') ? '<br>' + Festivity.liturgical_year : '');
            return {
                title: Festivity.name,
                start: Festivity.date.getUTCFullYear() + '-' + pad(Festivity.date.getUTCMonth() + 1) + '-' + pad(Festivity.date.getUTCDate()),
                backgroundColor: CSScolor,
                textColor: textColor,
                description: description,
                idx: Festivity.event_idx
            };
        });
    },
    updateFCSettings = events => {
        if (currentLocale !== 'en') {
            const locale = currentLocale.replaceAll('_', '-');
            let baseLocale = locale.split('-')[0];
            if (baseLocale === 'lat') {
                fullCalendarSettings.locale = la;
            } else {
                fullCalendarSettings.locale = baseLocale;
            }
        }
        if (parseInt(currentYear) !== today.getFullYear()) {
            fullCalendarSettings.initialDate = currentYear + '-01-01';
        }
        fullCalendarSettings.events = events;
    };

ApiClient.init().then( apiClient => {
    if (false === apiClient || false === apiClient instanceof ApiClient) {
        alert('Error initializing the Liturgical Calendar API Client');
    } else {
        const calendarSelect = new CalendarSelect( currentLocale );
        calendarSelect.allowNull()
        .label({
            class: 'form-label d-block mb-1'
        }).wrapper({
            class: 'form-group col col-md-3'
        }).class('form-select')
        .appendTo( '#calendarOptions');

        const apiOptions = new ApiOptions( currentLocale );
        apiOptions._acceptHeaderInput.hide()
        apiOptions._yearInput.class( 'form-control' );
        apiOptions.linkToCalendarSelect( calendarSelect ).appendTo( '#calendarOptions' );

        apiClient.listenTo( calendarSelect ).listenTo( apiOptions );
        apiClient._eventBus.on( 'calendarFetched', LitCalData => {
            currentYear = apiOptions._yearInput._domElement.value;
            console.log(`currentYear is ${currentYear}`);
            if (LitCalData.hasOwnProperty("litcal")) {
                const events = litCalDataToEvents( LitCalData.litcal );
                updateFCSettings( events );
                const calendar = new Calendar(document.getElementById('calendar'), fullCalendarSettings);
                calendar.render();
                document.querySelector('#spinnerWrapper').style.display = 'none';
                //even though the following code works for Latin, the Latin however is not removed for successive renders
                //in other locales. Must have something to do with how the renders are working, like an append or something?
                /*if (currentLocale === 'la') {
                    console.log('locale is Latin, now fixing days of the week');
                    $('.fc-day').each((idx, el) => {
                        $(el).find('a.fc-col-header-cell-cushion').text(dayNamesShort[idx]);
                        console.log($(el).find('a.fc-col-header-cell-cushion').text());
                    });
                }
                */

            }
            if (LitCalData.hasOwnProperty('messages')) {
                const messagesHtml = LitCalData.messages.map((message, idx) => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `<td>${idx}</td><td>${message}</td>`;
                    return tr;
                });
                document.querySelector('#LitCalMessages tbody').replaceChildren(...messagesHtml);
            }
        });
        // fetch a default calendar here
        apiClient.fetchNationalCalendar(calendarSelect._domElement.value);
    }
});
