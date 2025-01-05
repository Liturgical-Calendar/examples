import { ApiClient, CalendarSelect, ApiOptions, Input, WebCalendar, Grouping, ColorAs, Column, ColumnOrder, DateFormat, GradeDisplay } from 'https://cdn.jsdelivr.net/npm/@liturgical-calendar/components-js@1.0.7/+esm';

Input.setGlobalInputClass('form-select');
Input.setGlobalLabelClass('form-label d-block mb-1');
Input.setGlobalWrapper('div');
Input.setGlobalWrapperClass('form-group col col-md-3');

ApiClient.init().then( (apiClient) => {
    const calendarSelect = new CalendarSelect( document.documentElement.lang || 'en-US' );
    calendarSelect.allowNull()
        .label({
            class: 'form-label d-block mb-1'
        }).wrapper({
            class: 'form-group col col-md-3'
        }).class('form-select')
        .appendTo( '#calendarOptions');

    const apiOptions = new ApiOptions( document.documentElement.lang || 'en-US' );
    apiOptions._localeInput.defaultValue( document.documentElement.lang || 'en' );
    apiOptions._acceptHeaderInput.hide();
    apiOptions._yearInput.class( 'form-control' ); // override the global input class
    apiOptions.linkToCalendarSelect( calendarSelect ).appendTo( '#calendarOptions' );

    apiClient.listenTo( calendarSelect ).listenTo( apiOptions );
    apiClient._eventBus.on( 'calendarFetched', (LitCalData) => {
        if (LitCalData.hasOwnProperty('messages')) {
            const messagesHtml = LitCalData.messages.map((message, idx) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${idx}</td><td>${message}</td>`;
                return tr;
            });
            document.querySelector('#LitCalMessages tbody').replaceChildren(...messagesHtml);
        }
    });

    const webCalendar = new WebCalendar();
    webCalendar.id('LitCalTable')
    .firstColumnGrouping(Grouping.BY_LITURGICAL_SEASON)
    .psalterWeekColumn() // add psalter week column as the right hand most column
    .removeHeaderRow() // we don't need to see the header row
    .seasonColor(ColorAs.CSS_CLASS)
    .seasonColorColumns(Column.LITURGICAL_SEASON)
    .eventColor(ColorAs.INDICATOR)
    .eventColorColumns(Column.EVENT_DETAILS)
    .monthHeader() // enable month header at the start of each month
    .dateFormat(DateFormat.DAY_ONLY)
    .columnOrder(ColumnOrder.GRADE_FIRST)
    .gradeDisplay(GradeDisplay.ABBREVIATED)
    .attachTo( '#litcalWebcalendar' ) // the element in which the web calendar will be rendered, every time the calendar is updated
    .listenTo(apiClient);
    apiClient.fetchNationalCalendar('VA');
});
