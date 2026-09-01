import LitGrade from './LitGrade.js';
import { ApiClient, ApiOptionsFilter, CalendarControls, Input, ThemePreset } from '@liturgical-calendar/components-js';
import { Calendar } from '@fullcalendar/core';
import allLocales from '@fullcalendar/core/locales-all';
import dayGridPlugin from '@fullcalendar/daygrid';
import listPlugin from '@fullcalendar/list';
import bootstrap5Plugin from '@fullcalendar/bootstrap5';
import la from './la.js';


/**
 * Greys the holy days of obligation multiselect button when the current selection
 * predetermines that input, and hands it back to the user when it does not.
 *
 * Driven by `CalendarControls.selection.predeterminedInputs` rather than by the
 * calendar select's value. The two agree for THIS input -- holy days are not fixed by
 * any rite, so they follow the calendar half of the rule alone -- but the payload is
 * derived from the very rule ApiOptions uses to disable an input, so the greying and
 * the disabling cannot drift, and the same test now reads correctly for the four
 * inputs where `value === ''` does not: under the Ambrosian rite the Missal fixes
 * Epiphany, Ascension and Corpus Domini and does not establish the Eternal High
 * Priest, so those are predetermined with no calendar selected at all.
 *
 * @param {HTMLSelectElement} hdobInput - The holy days of obligation select element.
 * @param {boolean} readOnly - Whether the current selection predetermines the input.
 */
function setHolyDaysOfObligationBgColor(hdobInput, readOnly) {
    if (readOnly) {
        $(hdobInput).parent().find('button.multiselect').css('background-color', '#e9ecef');
    } else {
        $(hdobInput).multiselect('deselectAll', false).multiselect('selectAll', false).parent().find('button.multiselect').removeAttr('style');
    }
}

/**
 * Builds the grid column class for a form control's wrapper.
 *
 * Each of the two rows the form is split across is budgeted to twelve columns, so
 * neither wraps: 2 + 4 + 2 + 2 + 2 for the rite, calendar, locale, year type and
 * year, and 3 + 2 + 2 + 2 + 3 for the five General Roman parameters.
 *
 * @param {number} span - The number of columns to span at the md breakpoint.
 * @returns {string} The wrapper class.
 */
const formGroupClass = span => `form-group col col-md-${span}`;

// A preset covers CONTROLS and never LAYOUT -- no wrapper, no grid span, no spacing
// utility -- so the two wrapper globals stay here. The input and label class globals
// are gone: naming a preset opens the `theme.apiOptions` gate, so the theme bag below
// reaches all ten ApiOptions inputs and supplies both.
Input.setGlobalWrapper('div');
// The narrowest of the two widths any ApiOptions input takes; the wider ones
// override it individually below.
Input.setGlobalWrapperClass(formGroupClass(2));

/**
 * Reports a failure the user needs to see, rather than only the console.
 *
 * Uses toastr where the host page provides it -- the frontend loads it for the
 * examples page -- and falls back to a native `<dialog>` for the standalone pages,
 * which do not. Deliberately NOT `alert()`, which this example used to call: it
 * blocks the event loop, freezing the page behind a browser-chrome modal that
 * cannot be styled and, on the initial-fetch path, would have to be dismissed
 * before the spinner could even be hidden.
 *
 * @param {string} message - The message to show. Inserted as text, never as markup.
 * @returns {void}
 */
function reportFailure(message) {
    console.error(message);
    if (typeof toastr !== 'undefined') {
        toastr.error(message, null, { timeOut: 0, extendedTimeOut: 0, closeButton: true });
        return;
    }
    const dialog = document.createElement('dialog');
    dialog.className = 'litcal-failure';
    const text = document.createElement('p');
    text.textContent = message;
    const dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.className = 'btn btn-secondary';
    dismiss.textContent = 'Close';
    dismiss.addEventListener('click', () => dialog.close());
    // Remove on `close` rather than in the click handler: a modal <dialog> also
    // closes on Escape, which fires this event but not that click. Either way the
    // element has to leave the document, or a page that reports more than one
    // failure accumulates a dismissed dialog per failure.
    dialog.addEventListener('close', () => dialog.remove());
    dialog.append(text, dismiss);
    document.body.appendChild(dialog);
    dialog.showModal();
}

/**
 * Hides the loading spinner.
 *
 * Called when the initial request SETTLES and when startup fails outright, never
 * only on success: the spinner covers the page, so anything that leaves it up is
 * indistinguishable from a request that never returns.
 *
 * @returns {void}
 */
function hideSpinner() {
    const spinner = document.querySelector('#spinnerWrapper');
    if (spinner !== null) {
        spinner.style.display = 'none';
    }
}

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
    // CalendarControls, not CalendarViewer: this page's renderer is FullCalendar, and
    // CalendarViewer's mandatory `calendar` slot holds a WebCalendar that would have
    // nothing to do here. The messages slot lives on CalendarControls rather than only
    // on CalendarViewer for exactly this consumer.
    //
    // The two wires the rite needs are the trap this class exists to close. ApiOptions
    // rebuilds the calendar list and disables the temporal options the rite fixes, but
    // only the client turns the rite into a path segment; wiring just the first leaves
    // the form reading `ambrosian` while every request still goes to /calendar/roman/.
    // listenTo() installs both.
    //
    // Row one only. The General Roman parameters are appended separately below, so this
    // is ALL_CALENDARS rather than the NONE that put all ten inputs in one container.
    const controls = new CalendarControls({
        locale: currentLocale,
        apiClient,
        filter: ApiOptionsFilter.ALL_CALENDARS,
        theme: {
            // Since 2.8.0 a preset supplies the `select` and `input` classes this page
            // used to spell out, and naming one opens the `theme.apiOptions` gate, so
            // they reach all ten ApiOptions inputs as well as the two selects. The name
            // is hardcoded rather than probed for: this page renders Fullcalendar with
            // its own bootstrap5 plugin and theme system, so it is a Bootstrap 5 page
            // by construction. `label` is still written out because a preset covers
            // CONTROLS and never LAYOUT, and `d-block mb-1` is layout.
            preset: ThemePreset.BOOTSTRAP_5,
            label: 'form-label d-block mb-1',
            // Since 2.4.0 the wrapper role reaches the rite select too, so both selects
            // take their grid column from here rather than from a hand-built div.
            //
            // No flat `wrapper` key: since 2.7.0 that would reach the locale input as
            // well and wrap it a second time, overriding the global column class -- and
            // would then throw if anything below reached for that input's wrapper.
            riteSelect: { wrapperClass: formGroupClass(2) },
            calendarSelect: { wrapperClass: formGroupClass(4) }
        }
    });

    // The preset above styles all ten ApiOptions inputs, so what is left here is only
    // what a preset does not cover: the Accept header input's visibility, the two column
    // widths that differ from the global col-md-2, and the year type default. The
    // `yearInput.class( 'form-control' )` that used to sit here went with them -- it
    // overrode the global input class to reach the very value the `input` role already
    // resolves to under this preset.
    //
    // These are the canonical accessors 2.8.0 added. The underscore spellings still
    // work and are not deprecated, but on ApiOptions that prefix now means
    // package-internal, and these ten are the ones a consumer is meant to reach for.
    const apiOptions = controls.apiOptions;
    apiOptions.acceptHeaderInput.hide(); // flag read at append time, so before appendTo()
    // The two inputs with the longest option labels get the extra width; the rest
    // keep the global col-md-2.
    apiOptions.epiphanyInput.wrapperClass( formGroupClass(3) );
    apiOptions.holydaysOfObligationInput.wrapperClass( formGroupClass(3) );
    apiOptions.yearTypeInput.defaultValue('CIVIL');

    // Row one: the rite and calendar selects, then the ALL_CALENDARS inputs.
    controls.appendTo({
        controls: '#calendarOptions',
        messages: '#LitCalMessages tbody'
    });

    // Row two. ApiOptions is one object whose appendTo() moves whichever inputs its
    // CURRENT filter selects, so calling filter().appendTo() again distributes the rest
    // of the same instance into a second container -- no second ApiOptions, and no
    // duplicated inputs. The two filters select disjoint sets, so this leaves row one
    // alone, and neither is NONE, which a repeated filter() call does not allow.
    apiOptions.filter( ApiOptionsFilter.GENERAL_ROMAN ).appendTo( '#generalRomanOptions' );

    controls.listenTo( apiClient );

    // Only the FullCalendar half is left to do here: the messages slot named above
    // renders the API's messages array itself. Since 2.8.0 it sanitizes that markup
    // against an allowlist rather than writing it as text, so the decree links and
    // emphasis the API emits render as markup instead of as literal tags.
    controls.onCalendarFetched( LitCalData => {
        currentYear = parseInt(apiOptions.yearInput._domElement.value);
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
    });

    const holydaysInput = apiOptions.holydaysOfObligationInput._domElement;
    $(holydaysInput).multiselect({
        buttonWidth: '100%',
        buttonClass: 'form-select',
        templates: {
            button: '<button type="button" class="multiselect dropdown-toggle" data-bs-toggle="dropdown"><span class="multiselect-selected-text"></span></button>'
        },
    });

    /**
     * Repaints the multiselect button from a selection payload.
     *
     * @param {{predeterminedInputs: ReadonlyArray<string>}} selection - The payload.
     * @returns {void}
     */
    const paint = ({ predeterminedInputs }) => {
        setHolyDaysOfObligationBgColor(holydaysInput, predeterminedInputs.includes('holydaysOfObligationInput'));
    };

    // `selection` is a synchronous, race-free read and onSelectionChange() deliberately
    // does not fire on subscribe, so the initial paint is this one extra line. The
    // callback then fires once per user action, coalesced onto a microtask, and only
    // when the payload actually changed -- a locale change, or reselecting the option
    // already selected, notifies nobody. This replaces a raw `change` listener on the
    // calendar select plus a `value === ''` test, which is the library's own domain
    // knowledge re-derived by hand.
    paint(controls.selection);
    controls.onSelectionChange((selection) => {
        $(holydaysInput).multiselect('rebuild');
        paint(selection);
    });

    if (typeof FC_CONTROL !== 'undefined' && FC_CONTROL) {
        if (today.getMonth() === 11) {
            apiOptions.yearTypeInput._domElement.value = 'LITURGICAL';
        }
        fullCalendarSettings.datesSet = (dateInfo) => {
            const currentData = dateInfo.view.getCurrentData();
            const { currentViewType, currentDate } = currentData;
            console.log('current view', currentViewType);
            const viewedDate = new Date(currentDate);
            const viewedMonth = viewedDate.getMonth();
            console.log('current month: ', viewedMonth);
            if (viewedMonth === 11 && apiOptions.yearTypeInput._domElement.value === 'CIVIL') {
                apiOptions.yearTypeInput._domElement.value = 'LITURGICAL';
                shouldSetYearView = false;
                fullCalendarSettings.initialDate = `${currentYear}-12-01`;
                apiClient.yearType(apiOptions.yearTypeInput._domElement.value).year(currentYear+1).refetchCalendarData()
                    .catch( error => console.error(`Could not refetch the calendar: ${error.message}`) );
            } else {
                shouldSetYearView = true;
            }
        };
    }
    // The year type is set on the client by hand because defaultValue() fires no
    // change event, so the listener listenTo() installed has nothing to react to and
    // the first request would otherwise go out under the client's own default.
    apiClient.yearType(apiOptions.yearTypeInput._domElement.value);

    // controls.fetch() dispatches three ways from the data-calendartype attribute
    // CalendarSelect puts on each option: the empty option this select opens on is the
    // rite-level calendar, then national, then diocesan. The two branches written here
    // by hand had no diocesan case, so picking a diocese called fetchNationalCalendar()
    // with a diocese id.
    //
    // Since 2.0.0 the fetch methods return a promise that rejects rather than
    // logging the failure and swallowing it, so a bare call would surface as an
    // unhandled rejection.
    //
    // The spinner is hidden when that first request SETTLES, not only when it succeeds.
    // Hiding it inside onCalendarFetched() -- the only place it used to be hidden --
    // left it spinning over the page forever if the initial fetch failed, with the error
    // visible only in the console. 2.6.0 added `settled` for exactly this, but only on
    // the mountInto() path; on the constructor path this example uses, the fetch promise
    // is already ours, so .finally() is that same signal.
    controls.fetch()
        .catch( error => reportFailure(`Could not fetch the initial calendar: ${error.message}`) )
        .finally( hideSpinner );
}).catch( error => {
    // Since 2.0.0 init() rejects rather than resolving to false, so the
    // `apiClient instanceof ApiClient` guard this example used to need is gone.
    // This also catches anything thrown while building the page above, hence the
    // message covers both rather than naming the API client specifically.
    //
    // The spinner is hidden here too. It is only ever hidden, never re-shown, so a
    // failure on this path -- which is reached BEFORE the fetch whose .finally()
    // hides it above -- otherwise left it covering the page for good.
    hideSpinner();
    reportFailure(`Could not start the Liturgical Calendar example: ${error.message}`);
});

