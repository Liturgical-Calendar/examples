const thirdLevelDomain = window.location.hostname.split('.')[0];
const isStaging = ( thirdLevelDomain === 'litcal-staging' || window.location.pathname.includes( '-staging' ) );
const stagingURL = isStaging ? '-staging' : '';
const endpointV = isStaging ? 'dev' : 'v3';
const endpointURL = `https://litcal.johnromanodorazio.com/api/${endpointV}/LitCalEngine.php`;
const metadataURL = `https://litcal.johnromanodorazio.com/api/${endpointV}/LitCalMetadata.php`;

if(Cookies.get("currentLocale") === undefined){
    Cookies.set("currentLocale", navigator.language );
}

i18next.use(i18nextHttpBackend).init({
    debug: true,
    lng: Cookies.get("currentLocale").substring(0,2).toLowerCase(),
    fallbackLng: 'en',
    backend: {
        loadPath: 'locales/{{lng}}/{{ns}}.json'
    }
  }, () => { //err, t
    jqueryI18next.init(i18next, $);
    $(document).ready(() => {
        document.title = i18next.t("Generate-Roman-Calendar");
        $('.backNav').attr('href',`https://litcal${stagingURL}.johnromanodorazio.com/usage.php`);
        createHeader();
        $('#generateLitCal').button();
    
        if($('#nationalcalendar').val() !== "ITALY"){
            $('#diocesancalendar').prop('disabled',true);
        }
    
        $('#settingsWrapper').dialog("open");
    });
});

const translCommon = common => {
    if( common === '' ) return common;
    if( common === 'Proper' ) {
        return i18next.t('Proper');
    } else {
        $commons = common.split(",");
        $commons = $commons.map($txt => {
            let $common = $txt.split(":");
            let commonGeneralKey = $common[0].replaceAll(' ', '-');
            let commonSpecificKey = (typeof $common[1] !== 'undefined' && $common[1] != "") ? $common[1].replaceAll(' ', '-') : "";
            let $commonGeneral = i18next.exists(commonGeneralKey) ? i18next.t(commonGeneralKey) : $common[0];
            let $commonSpecific = commonSpecificKey !== "" && i18next.exists( commonSpecificKey ) ? i18next.t( commonSpecificKey ) : (typeof $common[1] !== 'undefined' ? $common[1] : "");
            let $commonKey = '';
            //$txt = str_replace(":", ": ", $txt);
            switch ($commonGeneral) {
                case i18next.t("Blessed-Virgin-Mary"):
                case i18next.t("Dedication-of-a-Church"):
                    $commonKey = i18next.t("of", {context: "(SING_FEMM)"});
                    break;
                case i18next.t("Virgins"):
                    $commonKey = i18next.t("of", {context: "(PLUR_FEMM)"});
                    break;
                case i18next.t("Martyrs"):
                case i18next.t("Pastors"):
                case i18next.t("Doctors"):
                case i18next.t("Holy-Men-and-Women"):
                    $commonKey = i18next.t("of", {context: "(PLUR_MASC)"});
                    break;
                default:
                    $commonKey = i18next.t("of", {context: "(SING_MASC)"});
            }
            return i18next.t("From-the-Common") + " " + $commonKey + " " + $commonGeneral + ($commonSpecific != "" ? ": " + $commonSpecific : "");
        });
        return $commons.join("; " + i18next.t("or") + " ");
    }
}

const highContrast = ['purple', 'red', 'green'];

let today = new Date(),
    $Settings = {
        "year": today.getUTCFullYear(),
        "epiphany": "JAN6",
        "ascension": "SUNDAY",
        "corpusChristi": "SUNDAY",
        "locale": "LA",
        "returntype": "JSON"
    },
    IntlDTOptions = {
        weekday: 'short',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC'
    },
    IntlMonthFmt = {
        month: 'long',
        timeZone: 'UTC'
    },
    countSameDayEvents = ($currentKeyIndex, $EventsArray, $cc) => {
        let $Keys = Object.keys($EventsArray);
        let $currentFestivity = $EventsArray[$Keys[$currentKeyIndex]];
        //console.log("currentFestivity: " + $currentFestivity.name + " | " + $currentFestivity.date);
        if ($currentKeyIndex < $Keys.length - 1) {
            let $nextFestivity = $EventsArray[$Keys[$currentKeyIndex + 1]];
            //console.log("nextFestivity: " + $nextFestivity.name + " | " + $nextFestivity.date);
            if ($nextFestivity.date.getTime() === $currentFestivity.date.getTime()) {
                //console.log("We have an occurrence!");
                $cc.count++;
                countSameDayEvents($currentKeyIndex + 1, $EventsArray, $cc);
            }
        }
    },
    countSameMonthEvents = ($currentKeyIndex, $EventsArray, $cm) => {
        let $Keys = Object.keys($EventsArray);
        let $currentFestivity = $EventsArray[$Keys[$currentKeyIndex]];
        if ($currentKeyIndex < $Keys.length - 1) {
            let $nextFestivity = $EventsArray[$Keys[$currentKeyIndex + 1]];
            if ($nextFestivity.date.getUTCMonth() == $currentFestivity.date.getUTCMonth()) {
                $cm.count++;
                countSameMonthEvents($currentKeyIndex + 1, $EventsArray, $cm);
            }
        }
    },
    getSeasonColor = (festivity,LitCal) => {
        let seasonColor = "green";
        if ((festivity.date.getTime() >= LitCal["Advent1"].date.getTime() && festivity.date.getTime() < LitCal["Christmas"].date.getTime()) || (festivity.date.getTime() >= LitCal["AshWednesday"].date.getTime() && festivity.date.getTime() < LitCal["Easter"].date.getTime())) {
            seasonColor = "purple";
        } else if (festivity.date.getTime() >= LitCal["Easter"].date.getTime() && festivity.date.getTime() <= LitCal["Pentecost"].date.getTime()) {
            seasonColor = "white";
        } else if (festivity.date.getTime() >= LitCal["Christmas"].date.getTime() || festivity.date.getTime() <= LitCal["BaptismLord"].date.getTime()) {
            seasonColor = "white";
        }
        return seasonColor;
    },
    processColors = festivity => {
        let possibleColors =  festivity.color.split(",");
        
        let festivityColorString;
        if(possibleColors.length === 1){
            festivityColorString = i18next.t(possibleColors[0]);
        } else if (possibleColors.length > 1){
            possibleColors = possibleColors.map(txt => i18next.t(txt));
            festivityColorString = possibleColors.join("</i> " + i18next.t("or") + " <i>");
        }
        return { CSScolor: possibleColors[0], festivityColorString: festivityColorString };
    },
    getFestivityGrade = (festivity, dy, keyname) => {
        if(festivity.hasOwnProperty('displayGrade') && festivity.displayGrade !== ''){
            festivityGrade = festivity.displayGrade;
        }
        else if(dy !== 7 || festivity.grade > 3){
            festivityGrade = (keyname === 'AllSouls' ? i18next.t("COMMEMORATION") : $GRADE[festivity.grade]);
        }
        return festivityGrade;
    },
    genLitCal = () => {
        $.ajax({
            method: 'POST',
            data: $Settings,
            url: endpointURL,
            success: LitCalData => {
                console.log(LitCalData);

                let strHTML = '';
                if (LitCalData.hasOwnProperty("LitCal")) {
                    let { LitCal } = LitCalData;
                    for (const key in LitCal) {
                        LitCal[key].date = new Date(LitCal[key].date * 1000);
                    }

                    let $dayCnt = 0;
                    let LitCalKeys = Object.keys(LitCal);

                    let $currentMonth = -1;
                    let $newMonth = false;
                    let $cm = {
                        count: 0
                    };
                    let $cc = {
                        count: 0
                    };
                    for (let $keyindex = 0; $keyindex < LitCalKeys.length; $keyindex++) {
                        $dayCnt++;
                        let keyname = LitCalKeys[$keyindex];
                        let festivity = LitCal[keyname];
                        let dy = (festivity.date.getUTCDay() === 0 ? 7 : festivity.date.getUTCDay()); // get the day of the week

                        //If we are at the start of a new month, count how many events we have in that same month, so we can display the Month table cell
                        if (festivity.date.getUTCMonth() !== $currentMonth) {
                            $newMonth = true;
                            $currentMonth = festivity.date.getUTCMonth();
                            $cm.count = 0;
                            countSameMonthEvents($keyindex, LitCal, $cm);
                        }

                        //Let's check if we have more than one event on the same day, such as optional memorials...
                        $cc.count = 0;
                        countSameDayEvents($keyindex, LitCal, $cc);
                        //console.log(festivity.name);
                        //console.log($cc);
                        if ($cc.count > 0) {
                            console.log("we have an occurrence of multiple festivities on same day");
                            for (let $ev = 0; $ev <= $cc.count; $ev++) {
                                keyname = LitCalKeys[$keyindex];
                                festivity = LitCal[keyname];
                                // LET'S DO SOME MORE MANIPULATION ON THE FESTIVITY->COMMON STRINGS AND THE FESTIVITY->COLOR...
                                festivity.common = translCommon( festivity.common );

                                let seasonColor = getSeasonColor( festivity, LitCal );
                                let { CSScolor, festivityColorString } = processColors( festivity );

                                strHTML += '<tr style="background-color:' + seasonColor + ';' + (highContrast.indexOf(seasonColor) != -1 ? 'color:white;' : '') + '">';
                                if ($newMonth) {
                                    let $monthRwsp = $cm.count + 1;
                                    strHTML += '<td class="rotate" rowspan = "' + $monthRwsp + '"><div>' + ($Settings.locale === 'LA' ? $months[festivity.date.getUTCMonth()].toUpperCase() : new Intl.DateTimeFormat($Settings.locale.toLowerCase(), IntlMonthFmt).format(festivity.date).toUpperCase()) + '</div></td>';
                                    $newMonth = false;
                                }

                                if ($ev == 0) {
                                    let $rwsp = $cc.count + 1;
                                    let festivity_date_str = $Settings.locale == 'LA' ? getLatinDateStr(festivity.date) : new Intl.DateTimeFormat($Settings.locale.toLowerCase(), IntlDTOptions).format(festivity.date);
                                    strHTML += '<td rowspan="' + $rwsp + '" class="dateEntry">' + festivity_date_str + '</td>';
                                }
                                currentCycle = (festivity.hasOwnProperty("liturgicalYear") ? ' (' + festivity.liturgicalYear + ')' : "");
                                festivityGrade = getFestivityGrade( festivity, dy, keyname );
                                strHTML += '<td style="background-color:'+CSScolor+';' + (highContrast.indexOf(CSScolor) != -1 ? 'color:white;' : 'color:black;') + '">' + festivity.name + currentCycle + ' - <i>' + festivityColorString + '</i><br /><i>' + festivity.common + '</i></td>';
                                strHTML += '<td style="background-color:'+CSScolor+';' + (highContrast.indexOf(CSScolor) != -1 ? 'color:white;' : 'color:black;') + '">' + festivityGrade + '</td>';
                                strHTML += '</tr>';
                                $keyindex++;
                            }
                            $keyindex--;

                        } else {
                            // LET'S DO SOME MORE MANIPULATION ON THE FESTIVITY->COMMON STRINGS AND THE FESTIVITY->COLOR...
                            festivity.common = translCommon(festivity.common);

                            let seasonColor = getSeasonColor( festivity, LitCal );
                            let { CSScolor, festivityColorString } = processColors( festivity );

                            strHTML += '<tr style="background-color:' + seasonColor + ';' + (highContrast.indexOf(seasonColor) != -1 ? 'color:white;' : 'color:black;') + '">';
                            if ($newMonth) {
                                let $monthRwsp = $cm.count + 1;
                                strHTML += '<td class="rotate" rowspan = "' + $monthRwsp + '"><div>' + ($Settings.locale === 'LA' ? $months[festivity.date.getUTCMonth()].toUpperCase() : new Intl.DateTimeFormat($Settings.locale.toLowerCase(), IntlMonthFmt).format(festivity.date).toUpperCase()) + '</div></td>';
                                $newMonth = false;
                            }

                            let festivity_date_str = $Settings.locale == 'LA' ? getLatinDateStr(festivity.date) : new Intl.DateTimeFormat($Settings.locale.toLowerCase(), IntlDTOptions).format(festivity.date);

                            strHTML += '<td class="dateEntry">' + festivity_date_str + '</td>';
                            currentCycle = (festivity.hasOwnProperty("liturgicalYear") ? ' (' + festivity.liturgicalYear + ')' : "");
                            festivityGrade = getFestivityGrade( festivity, dy, keyname );
                            strHTML += '<td style="background-color:'+CSScolor+';' + (highContrast.indexOf(CSScolor) != -1 ? 'color:white;' : 'color:black;') + '">' + festivity.name + currentCycle + ' - <i>' + festivityColorString + '</i><br /><i>' + festivity.common + '</i></td>';
                            strHTML += '<td style="background-color:'+CSScolor+';' + (highContrast.indexOf(CSScolor) != -1 ? 'color:white;' : 'color:black;') + '">' + festivityGrade + '</td>';
                            strHTML += '</tr>';
                        }

                    }
                    createHeader();
                    $('#LitCalTable tbody').html(strHTML);
                    $('#dayCnt').text($dayCnt);
                    $('#LitCalMessages thead').html(`<tr><th colspan=2 style="text-align:center;">${i18next.t("Information-about-current-calculation")}</th></tr>`);
                    $('#spinnerWrapper').fadeOut('slow');
                }
                if(LitCalData.hasOwnProperty('Messages')){
                    $('#LitCalMessages tbody').empty();
                    LitCalData.Messages.forEach((message,idx) => {
                        $('#LitCalMessages tbody').append(`<tr><td>${idx}</td><td>${message}</td></tr>`);
                    });
                }

            },
            error: (jqXHR, textStatus, errorThrown) => {
                console.log('(' + textStatus + ') ' + errorThrown);
                console.log(jqXHR.getAllResponseHeaders);
                console.log(jqXHR.responseText);
              }
            });
    },
    $daysOfTheWeek = [
        "dies Solis",
        "dies Lunae",
        "dies Martis",
        "dies Mercurii",
        "dies Iovis",
        "dies Veneris",
        "dies Saturni"
    ],
    $months = [
        "Ianuarius",
        "Februarius",
        "Martius",
        "Aprilis",
        "Maius",
        "Iunius",
        "Iulius",
        "Augustus",
        "September",
        "October",
        "November",
        "December"
    ],
    $GRADE = [],
    getLatinDateStr = $date => {
        festivity_date_str = $daysOfTheWeek[$date.getUTCDay()];
        festivity_date_str += ', ';
        festivity_date_str += $date.getUTCDate();
        festivity_date_str += ' ';
        festivity_date_str += $months[$date.getUTCMonth()];
        festivity_date_str += ' ';
        festivity_date_str += $date.getUTCFullYear();
        return festivity_date_str;
    },
    createHeader = () => {
        document.title = i18next.t("Generate-Roman-Calendar");
        $('#settingsWrapper').dialog("destroy").remove();
        $('header').empty();
        let templateStr = i18next.t('HTML-presentation');
        templateStr = templateStr.replace('%s',`<a href="${endpointURL}">PHP engine</a>`);
        let $header = `
            <h1 style="text-align:center;">${i18next.t('LitCal-Calculation')} (${$Settings.year})</h1>
            <h2 style="text-align:center;">${templateStr}</h2>
            <div style="text-align:center;border:2px groove White;border-radius:6px;width:60%;margin:0px auto;padding-bottom:6px;">
            <h3>${i18next.t('Configurations-used')}</h3>
            <span>${i18next.t('YEAR')} = ${$Settings.year}, ${i18next.t('EPIPHANY')} = ${$Settings.epiphany}, ${i18next.t('ASCENSION')} = ${$Settings.ascension}, CORPUS CHRISTI = ${$Settings.corpusChristi}, LOCALE = ${$Settings.locale}</span>
            </div>`,
        $tbheader = `<tr><th>${i18next.t("Month")}</th><th>${i18next.t("Date-Gregorian-Calendar")}</th><th>${i18next.t("General-Roman-Calendar-Festivity")}</th><th>${i18next.t("Grade-of-the-Festivity")}</th></tr>`,
        $settingsDialog = `<div id="settingsWrapper"><form id="calSettingsForm"><table id="calSettings">
        <tr><td colspan="2"><label>${i18next.t('YEAR')}: </td><td colspan="2"><input type="number" name="year" id="year" min="1969" max="9999" value="${$Settings.year}" /></label></td></tr>
        <tr><td><label>LOCALE: </td><td><select name="locale" id="locale"><option value="EN" ${($Settings.locale === "EN" ? " SELECTED" : "")}>ENGLISH</option><option value="IT" ${($Settings.locale === "IT" ? " SELECTED" : "")}>ITALIANO</option><option value="LA" ${($Settings.locale === "LA" ? " SELECTED" : "")}>LATINO</option></select></label></td><td>${i18next.t('National-Calendar')}: </td><td><select id="nationalcalendar" name="nationalcalendar"><option value=""></option><option value="VATICAN" ${($Settings.nationalcalendar === "VATICAN" ? " SELECTED" : "")}>${i18next.t('Vatican')}</option><option value="ITALY" ${($Settings.nationalcalendar === "ITALY" ? " SELECTED" : "")}>${i18next.t('Italy')}</option><option value="USA" ${($Settings.nationalcalendar === "USA" ? " SELECTED" : "")}>USA</option></select></td></tr>
        <tr><td><label>${i18next.t('EPIPHANY')}: </td><td><select name="epiphany" id="epiphany"><option value="JAN6" ${($Settings.epiphany === "JAN6" ? " SELECTED" : "")}>${i18next.t('January-6')}</option><option value="SUNDAY_JAN2_JAN8" ${($Settings.epiphany === "SUNDAY_JAN2_JAN8" ? " SELECTED" : "")}>${i18next.t('Sun-Jan2-Jan8')}</option></select></label></td><td>${i18next.t('Diocesan-Calendar')}: </td><td><select id="diocesancalendar" name="diocesancalendar" ${($Settings.nationalcalendar == '' || $Settings.nationalcalendar == 'VATICAN' ) ? 'disabled' : ''}></select></td></tr>
        <tr><td><label>${i18next.t('ASCENSION')}: </td><td><select name="ascension" id="ascension"><option value="THURSDAY" ${($Settings.ascension === "THURSDAY" ? " SELECTED" : "")}>${i18next.t('Thursday')}</option><option value="SUNDAY" ${($Settings.ascension === "SUNDAY" ? " SELECTED" : "")}>${i18next.t('Sunday')}</option></select></label></td><td></td><td></td></tr>
        <tr><td><label>CORPUS CHRISTI: </td><td><select name="corpusChristi" id="corpusChristi"><option value="THURSDAY" ${($Settings.corpusChristi === "THURSDAY" ? " SELECTED" : "")}>${i18next.t('Thursday')}</option><option value="SUNDAY" ${($Settings.corpusChristi === "SUNDAY" ? " SELECTED" : "")}>${i18next.t('Sunday')}</option></select></label></td><td></td><td></td></tr>
        <tr><td colspan="4" style="text-align:center;"><input type="submit" id="generateLitCal" value="${i18next.t("Generate-Roman-Calendar")}" /></td></tr>
        </table></form></div>`;
        $('header').html($header);
        $('#LitCalTable thead').html($tbheader);

        $($settingsDialog).dialog({
            title: i18next.t('CustomizeOptions'),
            modal: true,
            width: '80%',
            show: {
                effect: 'fade',
                duration: 500
            },
            hide: {
                effect: 'fade',
                duration: 500
            },
            autoOpen: false
        });

        if($Settings.nationalcalendar === 'USA'){
            if(Object.keys($DiocesesUSA).length > 0){
                $('#diocesancalendar').prop('disabled', false);
                $('#diocesancalendar').append('<option value=""></option>');
                for(const [key, value] of Object.entries($DiocesesUSA)){
                    $('#diocesancalendar').append('<option value="' + key + '">' + value.diocese + '</option>');
                }
            } else {
                $('#diocesancalendar').prop('disabled', true);
            }
        } else if ($Settings.nationalcalendar === 'ITALY'){
            if(Object.keys($DiocesesItaly).length > 0){
                $('#diocesancalendar').prop('disabled', false);
                $('#diocesancalendar').append('<option value=""></option>');
                for(const [key, value] of Object.entries($DiocesesItaly)){
                    $('#diocesancalendar').append('<option value="' + key + '">' + value.diocese + '</option>');
                }
            } else {
                $('#diocesancalendar').prop('disabled', true);
            }
        }

    },
    $index = {},
    $DiocesesUSA,
    $DiocesesItaly;

    jQuery.ajax({
        url: metadataURL,
        dataType: 'json',
        statusCode: {
            404: () => { console.log('The JSON definition "nations/index.json" does not exist yet.'); }
        },
        success: data => {
            console.log('retrieved data from index file:');
            console.log(data);
            $index = data;
            $DiocesesUSA = Object.filter($index, key => key.nation == "USA");
            $DiocesesItaly = Object.filter($index, key => key.nation == "ITALY");
        }
    });

$(document).on('click', '#openSettings', () => { $('#settingsWrapper').dialog("open"); });
$(document).on("submit", "#calSettingsForm", event => {
    event.preventDefault();
    let formValues = $(event.currentTarget).serializeArray();
    for(const obj of formValues){
        $Settings[obj.name] = obj.value;
    }

    i18next.changeLanguage($Settings.locale.toLowerCase(), () => { //err, t
        jqueryI18next.init(i18next, $);
        Cookies.set("currentLocale", $Settings.locale.toLowerCase() );
    });

    console.log('$Settings = ');
    console.log($Settings);

    $GRADE = [
        i18next.t("FERIA"),
        i18next.t("COMMEMORATION"),
        i18next.t("OPTIONAL-MEMORIAL"),
        i18next.t("MEMORIAL"),
        i18next.t("FEAST"),
        i18next.t("FEAST-OF-THE-LORD"),
        i18next.t("SOLEMNITY"),
        i18next.t("HIGHER-RANKING-SOLEMNITY")
    ];
    $('#settingsWrapper').dialog("close");
    genLitCal();
    return false;
});

$(document).on('change','#nationalcalendar', ev => {
    switch( $(ev.currentTarget).val() ){
      case "VATICAN":
        $('#locale').val('LA');
        $('#epiphany').val('JAN6');
        $('#ascension').val('THURSDAY');
        $('#corpusChristi').val('THURSDAY');
        $('#diocesancalendar').val("");
        $Settings.locale = 'LA';
        $Settings.epiphany = 'JAN6';
        $Settings.ascension = 'THURSDAY';
        $Settings.corpusChristi = 'THURSDAY';
        $Settings.diocesancalendar = '';
        $Settings.nationalcalendar = 'VATICAN';

        $('#calSettingsForm :input').not('#nationalcalendar').not('#year').not('#generateLitCal').prop('disabled',true);
      break;
      case "ITALY":
        $('#locale').val('IT');
        $('#epiphany').val('JAN6');
        $('#ascension').val('SUNDAY');
        $('#corpusChristi').val('SUNDAY');
        $Settings.locale = 'IT';
        $Settings.epiphany = 'JAN6';
        $Settings.ascension = 'SUNDAY';
        $Settings.corpusChristi = 'SUNDAY';
        $Settings.diocesancalendar = '';
        $Settings.nationalcalendar = 'ITALY';
        $('#calSettingsForm :input').not('#diocesancalendar').not('#nationalcalendar').not('#year').not('#generateLitCal').prop('disabled',true);
        $('#diocesancalendar').empty();
        if(Object.keys($DiocesesItaly).length > 0){
          $('#diocesancalendar').prop('disabled', false);
          $('#diocesancalendar').append('<option value=""></option>');
          for(const [key, value] of Object.entries($DiocesesItaly)){
            $('#diocesancalendar').append('<option value="' + key + '">' + value.diocese + '</option>');
          }
        } else {
          $('#diocesancalendar').prop('disabled', true);
        }
      break;
      case "USA":
        $('#locale').val('EN');
        $('#epiphany').val('SUNDAY_JAN2_JAN8');
        $('#ascension').val('SUNDAY');
        $('#corpusChristi').val('SUNDAY');
        $Settings.locale = 'EN';
        $Settings.epiphany = 'SUNDAY_JAN2_JAN8';
        $Settings.ascension = 'SUNDAY';
        $Settings.corpusChristi = 'SUNDAY';
        $Settings.diocesancalendar = '';
        $Settings.nationalcalendar = 'USA';
        $('#calSettingsForm :input').not('#nationalcalendar').not('#year').not('#generateLitCal').prop('disabled',true);

        //TODO: once the data for the Diocese of Rome has been define through the UI interface
        //      and the relative JSON file created, the following operation should be abstracted for any nation in the list
        //      and not applied here with the hardcoded value "USA"
        //      The logic has been started up above, before the 'switch'
        //      However we have to keep in mind that Rome groups together the celebrations for the whole Lazio region in a single booklet
        //      This would mean that we have to create the ability of creating groups, to group together the data from more than one diocese
        //      Perhaps another value can be added to the index, to indicate a group definition, such that all the diocesan calendars belonging to that group can be pulled...
        $('#diocesancalendar').empty();
        if(Object.keys($DiocesesUSA).length > 0){
          $('#diocesancalendar').prop('disabled', false);
          $('#diocesancalendar').append('<option value=""></option>');
          for(const [key, value] of Object.entries($DiocesesUSA)){
            $('#diocesancalendar').append('<option value="' + key + '">' + value.diocese + '</option>');
          }
        } else {
          $('#diocesancalendar').prop('disabled', true);
        }
        break;
      default:
        $('#calSettingsForm :input').prop('disabled',false);
        $('#diocesancalendar').val("").prop('disabled',true);
        $Settings.nationalcalendar = '';
    }
});

$(document).on('change', '#diocesancalendar', ev => {
    $Settings.diocesancalendar = $(ev.currentTarget).val();
});


Object.filter = (obj, predicate) => 
    Object.keys(obj)
      .filter( key => predicate(obj[key]) )
      .reduce( (res, key) => (res[key] = obj[key], res), {} );
