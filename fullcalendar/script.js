import LitGrade from './LitGrade.js';
import { ApiClient, CalendarSelect, RiteSelect, ApiOptions, Input } from '@liturgical-calendar/components-js';
import { Calendar } from '@fullcalendar/core';
import allLocales from '@fullcalendar/core/locales-all';
import dayGridPlugin from '@fullcalendar/daygrid';
import listPlugin from '@fullcalendar/list';
import bootstrap5Plugin from '@fullcalendar/bootstrap5';
import la from './la.js';


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
const today = Object.freeze(new Date());
//const FC_CONTROL = true;
const pad = n => n < 10 ? '0' + n : n,
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
    updateFCSettings = (events, setYearView = true) => {
        if (currentLocale !== 'en') {
            const locale = currentLocale.replaceAll('_', '-');
            let baseLocale = locale.split('-')[0];
            if (baseLocale === 'lat') {
                fullCalendarSettings.locale = la;
            } else {
                fullCalendarSettings.locale = baseLocale;
            }
        }
        if (setYearView && parseInt(currentYear) !== today.getFullYear()) {
            fullCalendarSettings.initialDate = currentYear + '-01-01';
        }
        fullCalendarSettings.events = events;
    };

let calendar,
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
            info.el.setAttribute('data-bs-toggle', 'tooltip');
            info.el.setAttribute('data-bs-html', 'true');
            info.el.setAttribute('data-bs-container', 'body');
            info.el.setAttribute('data-bs-custom-class', 'custom-tooltip');
            info.el.classList.add('p-1');
            new bootstrap.Tooltip(info.el);
            // Add black outline to white dots when in listMonth view
            const dotEl = info.el.getElementsByClassName('fc-list-event-dot')[0];
            if (dotEl && dotEl.style.borderColor === 'white') {
                dotEl.style.outline = '1px solid black';
            }
        },
        themeSystem: 'bootstrap5'
    },
    shouldSetYearView = true;

ApiClient.init(typeof BaseUrl !== 'undefined' ? BaseUrl : 'https://litcal.johnromanodorazio.com/api/dev').then( apiClient => {
    // Appended before the calendar select so it reads first in the form row.
    // It must also be in the DOM before linkToCalendarSelect() below, which
    // reads this element to attach the rite-change listener.
    //
    // RiteSelect has no wrapper() of its own — unlike CalendarSelect — so the
    // grid column it sits in is built here.
    //
    // No `text`: omitting it lets RiteSelect supply its own localized label.
    const riteSelectWrapper = document.createElement('div');
    riteSelectWrapper.className = 'form-group col col-md-3';
    document.querySelector('#calendarOptions').appendChild(riteSelectWrapper);

    const riteSelect = new RiteSelect( currentLocale );
    riteSelect.label({
        class: 'form-label d-block mb-1'
    }).class('form-select');
    riteSelect.appendTo( riteSelectWrapper );

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
    apiOptions._yearTypeInput.defaultValue('CIVIL');
    // Passing riteSelect marks the rite as explicit, so it is emitted as a path
    // segment and the calendar select is rebuilt whenever the rite changes. The
    // Ambrosian rite has no national tier and fixes Epiphany, Ascension, Corpus
    // Christi and the Eternal High Priest in its own books, so ApiOptions also
    // disables those four inputs for as long as it is selected.
    apiOptions.linkToCalendarSelect( calendarSelect ).linkToRiteSelect( riteSelect ).appendTo( '#calendarOptions' );

    // The rite select must be wired to the client as well as to ApiOptions:
    // ApiOptions rebuilds the calendar select on a rite change, but only the
    // client turns the rite into a path segment. Without this the form would
    // read `ambrosian` while the request still went to /calendar/roman/.
    apiClient.listenTo( calendarSelect ).listenTo( riteSelect ).listenTo( apiOptions );
    apiClient._eventBus.on( 'calendarFetched', LitCalData => {
        currentYear = parseInt(apiOptions._yearInput._domElement.value);
        //console.log(`currentYear is ${currentYear}`);
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

    if (typeof FC_CONTROL !== 'undefined' && FC_CONTROL) {
        if (today.getMonth() === 11) {
            apiOptions._yearTypeInput._domElement.value = 'LITURGICAL';
        }
        fullCalendarSettings.datesSet = (dateInfo) => {
            const currentData = dateInfo.view.getCurrentData();
            const { currentViewType, currentDate } = currentData;
            console.log('current view', currentViewType);
            const viewedDate = new Date(currentDate);
            const viewedMonth = viewedDate.getMonth();
            console.log('current month: ', viewedMonth);
            if (viewedMonth === 11 && apiOptions._yearTypeInput._domElement.value === 'CIVIL') {
                apiOptions._yearTypeInput._domElement.value = 'LITURGICAL';
                shouldSetYearView = false;
                fullCalendarSettings.initialDate = `${currentYear}-12-01`;
                apiClient.yearType(apiOptions._yearTypeInput._domElement.value).year(currentYear+1).refetchCalendarData()
                    .catch( error => console.error(`Could not refetch the calendar: ${error.message}`) );
            } else {
                shouldSetYearView = true;
            }
        };
    }
    // The select opens on its empty option — the rite-level calendar — which is
    // not a nation. Passing that empty value to fetchNationalCalendar() built
    // `/calendar/roman/nation//2026` and the calendar never rendered. Until
    // 1.5.0 this was unreachable: constructing a CalendarSelect threw first.
    //
    // Since 2.0.0 the fetch methods return a promise that rejects rather than
    // logging the failure and swallowing it, so a bare call would surface as an
    // unhandled rejection.
    apiClient.yearType(apiOptions._yearTypeInput._domElement.value);
    const initialCalendar = calendarSelect._domElement.value;
    const initialFetch = initialCalendar === ''
        ? apiClient.fetchCalendar()
        : apiClient.fetchNationalCalendar(initialCalendar);
    initialFetch.catch( error => console.error(`Could not fetch the initial calendar: ${error.message}`) );
}).catch( error => {
    // Since 2.0.0 init() rejects rather than resolving to false, so the
    // `apiClient instanceof ApiClient` guard this example used to need is gone.
    // This also catches anything thrown while building the page above, hence the
    // message covers both rather than naming the API client specifically.
    alert(`Could not start the Liturgical Calendar example: ${error.message}`);
});

