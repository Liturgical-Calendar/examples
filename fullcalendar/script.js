import LitGrade from './LitGrade.js';
import { ApiClient, CalendarSelect, ApiOptions, Input } from '@liturgical-calendar/components-js';
import { Calendar } from '@fullcalendar/core';
import allLocales from '@fullcalendar/core/locales-all';
import dayGridPlugin from '@fullcalendar/daygrid';
import listPlugin from '@fullcalendar/list';
import bootstrap5Plugin from '@fullcalendar/bootstrap5';
import la from './la.js';

/**
 * Filter an object based on a predicate function.
 * @param {Object} obj - The object to filter.
 * @param {Function} predicate - A function that takes an object value and returns a boolean.
 * @returns {Object} - A new object containing only the key-value pairs for which the predicate function returned true.
 */
Object.filter = (obj, predicate) =>
    Object.keys(obj)
        .filter( key => predicate(obj[key]) )
        .reduce( (res, key) => (res[key] = obj[key], res), {} );

/**
 * Sets the background color of the holy days of obligation select button based on the value of the calendar select element.
 * If the value is empty, the background color is removed.
 * If the value is not empty, the background color is set to #e9ecef.
 * @param {HTMLSelectElement} hdobInput - The holy days of obligation select element.
 * @param {string} calendarSelectValue - The value of the calendar select element.
 */
function setHolyDaysOfObligationBgColor(hdobInput, calendarSelectValue) {
    if (calendarSelectValue === '') {
        $(hdobInput).multiselect('deselectAll', false).multiselect('selectAll', false).parent().find('button.multiselect').removeAttr('style');
    } else {
        $(hdobInput).parent().find('button.multiselect').css('background-color', '#e9ecef');
    }
}

Input.setGlobalInputClass('form-select');
Input.setGlobalLabelClass('form-label d-block mb-1');
Input.setGlobalWrapper('div');
Input.setGlobalWrapperClass('form-group col col-md-3');

const currentLocale = Cookies.get('currentLocale') ?? 'en';
let calendar = null;

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
        return LitCal.map( (liturgical_event) => {
            liturgical_event.date = new Date(liturgical_event.date);
            const DayOfTheWeek = (liturgical_event.date.getDay() === 0 ? 7 : liturgical_event.date.getDay()); // get the day of the week
            const CSScolor = liturgical_event.color[0] === 'rose' ? 'pink' : liturgical_event.color[0]; // map 'rose' to 'pink' for CSS
            const textColor = (CSScolor === 'white' || CSScolor === 'pink' ? 'black' : 'white');
            let eventGrade = '';
            if (liturgical_event.hasOwnProperty('grade_display') && liturgical_event.grade_display !== null) {
                eventGrade = liturgical_event.grade_display === '' ? '' : liturgical_event.grade_display + ', ';
            }
            else if (DayOfTheWeek !== 7 || liturgical_event.grade > 3) {
                const { tags } = LitGrade.strWTags( liturgical_event.grade );
                eventGrade = tags[0] + liturgical_event.grade_lcl + tags[1] + ', ';
            }
            let description = '<b>' + liturgical_event.name + '</b><br>' + eventGrade + '<i>' + liturgical_event.color_lcl + '</i><br><i style="font-size:.8em;">' + liturgical_event.common_lcl + '</i>' + (liturgical_event.hasOwnProperty('liturgical_year') ? '<br>' + liturgical_event.liturgical_year : '');
            return {
                title: liturgical_event.name,
                start: liturgical_event.date.getUTCFullYear() + '-' + pad(liturgical_event.date.getUTCMonth() + 1) + '-' + pad(liturgical_event.date.getUTCDate()),
                backgroundColor: CSScolor,
                textColor: textColor,
                description: description,
                idx: liturgical_event.event_idx
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

ApiClient.init(typeof BaseUrl !== 'undefined' ? BaseUrl : 'https://litcal.johnromanodorazio.com/api/dev').then( apiClient => {
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
        apiOptions._ascensionInput.wrapperClass('form-group col col-md-2');
        apiOptions._corpusChristiInput.wrapperClass('form-group col col-md-2');
        apiOptions._eternalHighPriestInput.wrapperClass('form-group col col-md-2');
        apiOptions.linkToCalendarSelect( calendarSelect ).appendTo( '#calendarOptions' );

        apiClient.listenTo( calendarSelect ).listenTo( apiOptions );
        apiClient._eventBus.on( 'calendarFetched', LitCalData => {
            currentYear = apiOptions._yearInput._domElement.value;
            console.log(`currentYear is ${currentYear}`);
            if (LitCalData.hasOwnProperty("litcal")) {
                const events = litCalDataToEvents( LitCalData.litcal );
                updateFCSettings( events );
                const calendarEl = document.getElementById('calendar');
                if (false === calendar instanceof Calendar) {
                    calendar = new Calendar(calendarEl, fullCalendarSettings);
                } else {
                    calendar.destroy();
                    calendar = new Calendar(calendarEl, fullCalendarSettings);
                }
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

        $(apiOptions._holydaysOfObligationInput._domElement).multiselect({
            buttonWidth: '100%',
            buttonClass: 'form-select',
            templates: {
                button: '<button type="button" class="multiselect dropdown-toggle" data-bs-toggle="dropdown"><span class="multiselect-selected-text"></span></button>'
            },
        });

        setHolyDaysOfObligationBgColor(apiOptions._holydaysOfObligationInput._domElement, calendarSelect._domElement.value);

        calendarSelect._domElement.addEventListener('change', (ev) => {
            $(apiOptions._holydaysOfObligationInput._domElement).multiselect('rebuild');
            setHolyDaysOfObligationBgColor(apiOptions._holydaysOfObligationInput._domElement, ev.target.value);
        });


        // fetch a default calendar here
        apiClient.fetchNationalCalendar(calendarSelect._domElement.value);
    }
});
