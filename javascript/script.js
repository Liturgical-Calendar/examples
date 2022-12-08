const thirdLevelDomain = window.location.hostname.split('.')[0];
const isStaging = ( thirdLevelDomain === 'litcal-staging' || window.location.pathname.includes( '-staging' ) );
const stagingURL = isStaging ? '-staging' : '';
const endpointV = isStaging ? 'dev' : 'v3';
const endpointURL = `https://litcal.johnromanodorazio.com/api/${endpointV}/LitCalEngine.php`;
const metadataURL = `https://litcal.johnromanodorazio.com/api/${endpointV}/LitCalMetadata.php`;

if(Cookies.get("currentLocale") === undefined){
    Cookies.set("currentLocale", navigator.language );
}

const translCommon = common => {
    if( common.length === 0 ) return '';
    if( common.includes( 'Proper' ) ) {
        return i18next.t('Proper');
    } else {
        $commons = common; //.split(",");
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
    $index = {},
    $Settings = {
        "year": today.getUTCFullYear(),
        "epiphany": "JAN6",
        "ascension": "SUNDAY",
        "corpusChristi": "SUNDAY",
        "locale": "la",
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
    countSameDayEvents = ($currentKeyIndex, eventsArray, cc) => {
        let $Keys = Object.keys(eventsArray);
        let $currentFestivity = eventsArray[$Keys[$currentKeyIndex]];
        //console.log("currentFestivity: " + $currentFestivity.name + " | " + $currentFestivity.date);
        if ($currentKeyIndex < $Keys.length - 1) {
            let $nextFestivity = eventsArray[$Keys[$currentKeyIndex + 1]];
            //console.log("nextFestivity: " + $nextFestivity.name + " | " + $nextFestivity.date);
            if ($nextFestivity.date.getTime() === $currentFestivity.date.getTime()) {
                //console.log("We have an occurrence!");
                cc.count++;
                countSameDayEvents($currentKeyIndex + 1, eventsArray, cc);
            }
        }
    },
    countSameMonthEvents = ($currentKeyIndex, eventsArray, cm) => {
        let $Keys = Object.keys(eventsArray);
        let $currentFestivity = eventsArray[$Keys[$currentKeyIndex]];
        if ($currentKeyIndex < $Keys.length - 1) {
            let $nextFestivity = eventsArray[$Keys[$currentKeyIndex + 1]];
            if ($nextFestivity.date.getUTCMonth() == $currentFestivity.date.getUTCMonth()) {
                cm.count++;
                countSameMonthEvents($currentKeyIndex + 1, eventsArray, cm);
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
        let possibleColors = festivity.color; //.split(",");
        let CSSColor = possibleColors[0];
        let festivityColorString;
        if(possibleColors.length === 1){
            festivityColorString = i18next.t(possibleColors[0]);
        } else if (possibleColors.length > 1){
            possibleColors = possibleColors.map(txt => i18next.t(txt));
            festivityColorString = possibleColors.join("</i> " + i18next.t("or") + " <i>");
        }
        return { CSScolor: CSSColor, festivityColorString: festivityColorString };
    },
    getFestivityGrade = (festivity, dy, keyname) => {
        let festivityGrade = '';
        if(festivity.hasOwnProperty('displayGrade') && festivity.displayGrade !== ''){
            festivityGrade = festivity.displayGrade;
        }
        else if(dy !== 7 || festivity.grade > 3){
            festivityGrade = (keyname === 'AllSouls' ? i18next.t("COMMEMORATION") : $GRADE[festivity.grade]);
        }
        return festivityGrade;
    },
    buildHTMLString = (strHTML, festivity, LitCal, newMonth, cc, cm, dy, keyname, ev) => {

        festivity.common = translCommon( festivity.common );
        let { CSScolor, festivityColorString } = processColors( festivity );
        let seasonColor = getSeasonColor( festivity, LitCal );
        strHTML += '<tr style="background-color:' + seasonColor + ';' + (highContrast.indexOf(seasonColor) != -1 ? 'color:white;' : 'color:black;') + '">';
        if (newMonth) {
            let monthRwsp = cm.count + 1;
            strHTML += '<td class="rotate" rowspan = "' + monthRwsp + '"><div>' + ($Settings.locale === 'la' ? $months[festivity.date.getUTCMonth()].toUpperCase() : new Intl.DateTimeFormat($Settings.locale.replaceAll('_','-') , IntlMonthFmt).format(festivity.date).toUpperCase()) + '</div></td>';
            newMonth = false;
        }
        let festivity_date_str = $Settings.locale == 'la' ? getLatinDateStr(festivity.date) : new Intl.DateTimeFormat($Settings.locale.replaceAll('_','-') , IntlDTOptions).format(festivity.date);

        if( ev === null ) {
            strHTML += '<td class="dateEntry">' + festivity_date_str + '</td>';
        }
        else if ( ev == 0 ) {
            strHTML += '<td class="dateEntry" rowspan="' + (cc.count + 1) + '">' + festivity_date_str + '</td>';
        }

        let currentCycle = (festivity.hasOwnProperty("liturgicalYear") ? ' (' + festivity.liturgicalYear + ')' : "");
        let festivityGrade = getFestivityGrade( festivity, dy, keyname );
        strHTML += '<td style="background-color:'+CSScolor+';' + (highContrast.indexOf(CSScolor) != -1 ? 'color:white;' : 'color:black;') + '">' + festivity.name + currentCycle + ' - <i>' + festivityColorString + '</i><br /><i>' + festivity.common + '</i></td>';
        strHTML += '<td style="background-color:'+CSScolor+';' + (highContrast.indexOf(CSScolor) != -1 ? 'color:white;' : 'color:black;') + '">' + festivityGrade + '</td>';
        strHTML += '</tr>';
        return { newHTMLStr: strHTML, monthFlag: newMonth };

    },
    genLitCal = () => {
        $.ajax({
            method: 'POST',
            data: $Settings,
            url: endpointURL,
            success: LitCalData => {
                console.log(LitCalData);
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
            
                let strHTML = '';
                if (LitCalData.hasOwnProperty("LitCal")) {
                    let { LitCal } = LitCalData;
                    for (const key in LitCal) {
                        LitCal[key].date = new Date(LitCal[key].date * 1000);
                    }

                    let dayCnt = 0;
                    let LitCalKeys = Object.keys(LitCal);

                    let currentMonth = -1;
                    let newMonth = false;
                    let cm = {
                        count: 0
                    };
                    let cc = {
                        count: 0
                    };
                    for (let keyindex = 0; keyindex < LitCalKeys.length; keyindex++) {
                        dayCnt++;
                        let keyname = LitCalKeys[keyindex];
                        let festivity = LitCal[keyname];
                        let dy = (festivity.date.getUTCDay() === 0 ? 7 : festivity.date.getUTCDay()); // get the day of the week

                        //If we are at the start of a new month, count how many events we have in that same month, so we can display the Month table cell
                        if (festivity.date.getUTCMonth() !== currentMonth) {
                            newMonth = true;
                            currentMonth = festivity.date.getUTCMonth();
                            cm.count = 0;
                            countSameMonthEvents(keyindex, LitCal, cm);
                        }

                        //Let's check if we have more than one event on the same day, such as optional memorials...
                        cc.count = 0;
                        countSameDayEvents(keyindex, LitCal, cc);
                        //console.log(festivity.name);
                        //console.log(cc);
                        if (cc.count > 0) {
                            console.log("we have an occurrence of multiple festivities on same day");
                            for (let ev = 0; ev <= cc.count; ev++) {
                                keyname = LitCalKeys[keyindex];
                                festivity = LitCal[keyname];
                                let { newHTMLStr, monthFlag } = buildHTMLString( strHTML, festivity, LitCal, newMonth, cc, cm, dy, keyname, ev );
                                strHTML = newHTMLStr;
                                newMonth = monthFlag;
                                keyindex++;
                            }
                            keyindex--;

                        } else {
                            let { newHTMLStr, monthFlag } = buildHTMLString( strHTML, festivity, LitCal, newMonth, cc, cm, dy, keyname, null );
                            strHTML = newHTMLStr;
                            newMonth = monthFlag;
                        }

                    }
                    createHeader();
                    $('#LitCalTable tbody').html(strHTML);
                    $('#dayCnt').text(dayCnt);
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
    buildHeaderAndDialog = () => {
        let templateStr = i18next.t('HTML-presentation').replace('%s',`<a href="${endpointURL}">PHP engine</a>`),
            header = `
                <h1 style="text-align:center;">${i18next.t('LitCal-Calculation')} (${$Settings.year})</h1>
                <h2 style="text-align:center;">${templateStr}</h2>
                <div style="text-align:center;border:2px groove White;border-radius:6px;width:60%;margin:0px auto;padding-bottom:6px;">
                <h3>${i18next.t('Configurations-used')}</h3>
                <span>${i18next.t('YEAR')} = ${$Settings.year}, ${i18next.t('EPIPHANY')} = ${$Settings.epiphany}, ${i18next.t('ASCENSION')} = ${$Settings.ascension}, CORPUS CHRISTI = ${$Settings.corpusChristi}, LOCALE = ${$Settings.locale}</span>
                </div>`,
            tbheader = `
                <tr><th>${i18next.t("Month")}</th><th>${i18next.t("Date-Gregorian-Calendar")}</th><th>${i18next.t("General-Roman-Calendar-Festivity")}</th><th>${i18next.t("Grade-of-the-Festivity")}</th></tr>`,
            $nationalCalendarSelect = `<select id="nationalcalendar" name="nationalcalendar"><option value=""></option>`;
            for( const key of Object.keys( $index.NationalCalendars ) ) {
                $nationalCalendarSelect += `<option value="${key}" ${($Settings.nationalcalendar === key ? " SELECTED" : "")}>${key}</option>`;
            }
            $nationalCalendarSelect += `</select>`;
            const $localesSelect = `<select class="form-control" name="locale" id="locale">
                <option value="af">Afrikaans</option>
                <option value="af_NA">Afrikaans (Namibia)</option>
                <option value="af_ZA">Afrikaans (South Africa)</option>
                <option value="agq">Aghem</option>
                <option value="agq_CM">Aghem (Cameroon)</option>
                <option value="ak">Akan</option>
                <option value="ak_GH">Akan (Ghana)</option>
                <option value="sq">Albanian</option>
                <option value="sq_AL">Albanian (Albania)</option>
                <option value="sq_XK">Albanian (Kosovo)</option>
                <option value="sq_MK">Albanian (North Macedonia)</option>
                <option value="am">Amharic</option>
                <option value="am_ET">Amharic (Ethiopia)</option>
                <option value="ar">Arabic</option>
                <option value="ar_DZ">Arabic (Algeria)</option>
                <option value="ar_BH">Arabic (Bahrain)</option>
                <option value="ar_TD">Arabic (Chad)</option>
                <option value="ar_KM">Arabic (Comoros)</option>
                <option value="ar_DJ">Arabic (Djibouti)</option>
                <option value="ar_EG">Arabic (Egypt)</option>
                <option value="ar_ER">Arabic (Eritrea)</option>
                <option value="ar_IQ">Arabic (Iraq)</option>
                <option value="ar_IL">Arabic (Israel)</option>
                <option value="ar_JO">Arabic (Jordan)</option>
                <option value="ar_KW">Arabic (Kuwait)</option>
                <option value="ar_LB">Arabic (Lebanon)</option>
                <option value="ar_LY">Arabic (Libya)</option>
                <option value="ar_MR">Arabic (Mauritania)</option>
                <option value="ar_MA">Arabic (Morocco)</option>
                <option value="ar_OM">Arabic (Oman)</option>
                <option value="ar_PS">Arabic (Palestinian Territories)</option>
                <option value="ar_QA">Arabic (Qatar)</option>
                <option value="ar_SA">Arabic (Saudi Arabia)</option>
                <option value="ar_SO">Arabic (Somalia)</option>
                <option value="ar_SS">Arabic (South Sudan)</option>
                <option value="ar_SD">Arabic (Sudan)</option>
                <option value="ar_SY">Arabic (Syria)</option>
                <option value="ar_TN">Arabic (Tunisia)</option>
                <option value="ar_AE">Arabic (United Arab Emirates)</option>
                <option value="ar_EH">Arabic (Western Sahara)</option>
                <option value="ar_001">Arabic (World)</option>
                <option value="ar_YE">Arabic (Yemen)</option>
                <option value="hy">Armenian</option>
                <option value="hy_AM">Armenian (Armenia)</option>
                <option value="as">Assamese</option>
                <option value="as_IN">Assamese (India)</option>
                <option value="ast">Asturian</option>
                <option value="ast_ES">Asturian (Spain)</option>
                <option value="asa">Asu</option>
                <option value="asa_TZ">Asu (Tanzania)</option>
                <option value="az">Azerbaijani</option>
                <option value="az_Cyrl_AZ">Azerbaijani (Cyrillic, Azerbaijan)</option>
                <option value="az_Cyrl">Azerbaijani (Cyrillic)</option>
                <option value="az_Latn_AZ">Azerbaijani (Latin, Azerbaijan)</option>
                <option value="az_Latn">Azerbaijani (Latin)</option>
                <option value="ksf">Bafia</option>
                <option value="ksf_CM">Bafia (Cameroon)</option>
                <option value="bm">Bambara</option>
                <option value="bm_ML">Bambara (Mali)</option>
                <option value="bn">Bangla</option>
                <option value="bn_BD">Bangla (Bangladesh)</option>
                <option value="bn_IN">Bangla (India)</option>
                <option value="bas">Basaa</option>
                <option value="bas_CM">Basaa (Cameroon)</option>
                <option value="eu">Basque</option>
                <option value="eu_ES">Basque (Spain)</option>
                <option value="be">Belarusian</option>
                <option value="be_BY">Belarusian (Belarus)</option>
                <option value="bem">Bemba</option>
                <option value="bem_ZM">Bemba (Zambia)</option>
                <option value="bez">Bena</option>
                <option value="bez_TZ">Bena (Tanzania)</option>
                <option value="brx">Bodo</option>
                <option value="brx_IN">Bodo (India)</option>
                <option value="bs">Bosnian</option>
                <option value="bs_Cyrl_BA">Bosnian (Cyrillic, Bosnia &amp; Herzegovina)</option>
                <option value="bs_Cyrl">Bosnian (Cyrillic)</option>
                <option value="bs_Latn_BA">Bosnian (Latin, Bosnia &amp; Herzegovina)</option>
                <option value="bs_Latn">Bosnian (Latin)</option>
                <option value="br">Breton</option>
                <option value="br_FR">Breton (France)</option>
                <option value="bg">Bulgarian</option>
                <option value="bg_BG">Bulgarian (Bulgaria)</option>
                <option value="my">Burmese</option>
                <option value="my_MM">Burmese (Myanmar [Burma])</option>
                <option value="yue">Cantonese</option>
                <option value="yue_Hans_CN">Cantonese (Simplified, China)</option>
                <option value="yue_Hans">Cantonese (Simplified)</option>
                <option value="yue_Hant_HK">Cantonese (Traditional, Hong Kong SAR China)</option>
                <option value="yue_Hant">Cantonese (Traditional)</option>
                <option value="ca">Catalan</option>
                <option value="ca_AD">Catalan (Andorra)</option>
                <option value="ca_FR">Catalan (France)</option>
                <option value="ca_IT">Catalan (Italy)</option>
                <option value="ca_ES">Catalan (Spain)</option>
                <option value="ceb">Cebuano</option>
                <option value="ceb_PH">Cebuano (Philippines)</option>
                <option value="tzm">Central Atlas Tamazight</option>
                <option value="tzm_MA">Central Atlas Tamazight (Morocco)</option>
                <option value="ckb">Central Kurdish</option>
                <option value="ckb_IR">Central Kurdish (Iran)</option>
                <option value="ckb_IQ">Central Kurdish (Iraq)</option>
                <option value="ccp">Chakma</option>
                <option value="ccp_BD">Chakma (Bangladesh)</option>
                <option value="ccp_IN">Chakma (India)</option>
                <option value="ce">Chechen</option>
                <option value="ce_RU">Chechen (Russia)</option>
                <option value="chr">Cherokee</option>
                <option value="chr_US">Cherokee (United States)</option>
                <option value="cgg">Chiga</option>
                <option value="cgg_UG">Chiga (Uganda)</option>
                <option value="zh">Chinese</option>
                <option value="zh_Hans_CN">Chinese (Simplified, China)</option>
                <option value="zh_Hans_HK">Chinese (Simplified, Hong Kong SAR China)</option>
                <option value="zh_Hans_MO">Chinese (Simplified, Macao SAR China)</option>
                <option value="zh_Hans_SG">Chinese (Simplified, Singapore)</option>
                <option value="zh_Hans">Chinese (Simplified)</option>
                <option value="zh_Hant_HK">Chinese (Traditional, Hong Kong SAR China)</option>
                <option value="zh_Hant_MO">Chinese (Traditional, Macao SAR China)</option>
                <option value="zh_Hant_TW">Chinese (Traditional, Taiwan)</option>
                <option value="zh_Hant">Chinese (Traditional)</option>
                <option value="ksh">Colognian</option>
                <option value="ksh_DE">Colognian (Germany)</option>
                <option value="kw">Cornish</option>
                <option value="kw_GB">Cornish (United Kingdom)</option>
                <option value="hr">Croatian</option>
                <option value="hr_BA">Croatian (Bosnia &amp; Herzegovina)</option>
                <option value="hr_HR">Croatian (Croatia)</option>
                <option value="cs">Czech</option>
                <option value="cs_CZ">Czech (Czechia)</option>
                <option value="da">Danish</option>
                <option value="da_DK">Danish (Denmark)</option>
                <option value="da_GL">Danish (Greenland)</option>
                <option value="dua">Duala</option>
                <option value="dua_CM">Duala (Cameroon)</option>
                <option value="nl">Dutch</option>
                <option value="nl_AW">Dutch (Aruba)</option>
                <option value="nl_BE">Dutch (Belgium)</option>
                <option value="nl_BQ">Dutch (Caribbean Netherlands)</option>
                <option value="nl_CW">Dutch (Curaçao)</option>
                <option value="nl_NL">Dutch (Netherlands)</option>
                <option value="nl_SX">Dutch (Sint Maarten)</option>
                <option value="nl_SR">Dutch (Suriname)</option>
                <option value="dz">Dzongkha</option>
                <option value="dz_BT">Dzongkha (Bhutan)</option>
                <option value="ebu">Embu</option>
                <option value="ebu_KE">Embu (Kenya)</option>
                <option value="en">English</option>
                <option value="en_AS">English (American Samoa)</option>
                <option value="en_AI">English (Anguilla)</option>
                <option value="en_AG">English (Antigua &amp; Barbuda)</option>
                <option value="en_AU">English (Australia)</option>
                <option value="en_AT">English (Austria)</option>
                <option value="en_BS">English (Bahamas)</option>
                <option value="en_BB">English (Barbados)</option>
                <option value="en_BE">English (Belgium)</option>
                <option value="en_BZ">English (Belize)</option>
                <option value="en_BM">English (Bermuda)</option>
                <option value="en_BW">English (Botswana)</option>
                <option value="en_IO">English (British Indian Ocean Territory)</option>
                <option value="en_VG">English (British Virgin Islands)</option>
                <option value="en_BI">English (Burundi)</option>
                <option value="en_CM">English (Cameroon)</option>
                <option value="en_CA">English (Canada)</option>
                <option value="en_KY">English (Cayman Islands)</option>
                <option value="en_CX">English (Christmas Island)</option>
                <option value="en_CC">English (Cocos [Keeling] Islands)</option>
                <option value="en_CK">English (Cook Islands)</option>
                <option value="en_CY">English (Cyprus)</option>
                <option value="en_DK">English (Denmark)</option>
                <option value="en_DG">English (Diego Garcia)</option>
                <option value="en_DM">English (Dominica)</option>
                <option value="en_ER">English (Eritrea)</option>
                <option value="en_SZ">English (Eswatini)</option>
                <option value="en_150">English (Europe)</option>
                <option value="en_FK">English (Falkland Islands)</option>
                <option value="en_FJ">English (Fiji)</option>
                <option value="en_FI">English (Finland)</option>
                <option value="en_GM">English (Gambia)</option>
                <option value="en_DE">English (Germany)</option>
                <option value="en_GH">English (Ghana)</option>
                <option value="en_GI">English (Gibraltar)</option>
                <option value="en_GD">English (Grenada)</option>
                <option value="en_GU">English (Guam)</option>
                <option value="en_GG">English (Guernsey)</option>
                <option value="en_GY">English (Guyana)</option>
                <option value="en_HK">English (Hong Kong SAR China)</option>
                <option value="en_IN">English (India)</option>
                <option value="en_IE">English (Ireland)</option>
                <option value="en_IM">English (Isle of Man)</option>
                <option value="en_IL">English (Israel)</option>
                <option value="en_JM">English (Jamaica)</option>
                <option value="en_JE">English (Jersey)</option>
                <option value="en_KE">English (Kenya)</option>
                <option value="en_KI">English (Kiribati)</option>
                <option value="en_LS">English (Lesotho)</option>
                <option value="en_LR">English (Liberia)</option>
                <option value="en_MO">English (Macao SAR China)</option>
                <option value="en_MG">English (Madagascar)</option>
                <option value="en_MW">English (Malawi)</option>
                <option value="en_MY">English (Malaysia)</option>
                <option value="en_MT">English (Malta)</option>
                <option value="en_MH">English (Marshall Islands)</option>
                <option value="en_MU">English (Mauritius)</option>
                <option value="en_FM">English (Micronesia)</option>
                <option value="en_MS">English (Montserrat)</option>
                <option value="en_NA">English (Namibia)</option>
                <option value="en_NR">English (Nauru)</option>
                <option value="en_NL">English (Netherlands)</option>
                <option value="en_NZ">English (New Zealand)</option>
                <option value="en_NG">English (Nigeria)</option>
                <option value="en_NU">English (Niue)</option>
                <option value="en_NF">English (Norfolk Island)</option>
                <option value="en_MP">English (Northern Mariana Islands)</option>
                <option value="en_PK">English (Pakistan)</option>
                <option value="en_PW">English (Palau)</option>
                <option value="en_PG">English (Papua New Guinea)</option>
                <option value="en_PH">English (Philippines)</option>
                <option value="en_PN">English (Pitcairn Islands)</option>
                <option value="en_PR">English (Puerto Rico)</option>
                <option value="en_RW">English (Rwanda)</option>
                <option value="en_WS">English (Samoa)</option>
                <option value="en_SC">English (Seychelles)</option>
                <option value="en_SL">English (Sierra Leone)</option>
                <option value="en_SG">English (Singapore)</option>
                <option value="en_SX">English (Sint Maarten)</option>
                <option value="en_SI">English (Slovenia)</option>
                <option value="en_SB">English (Solomon Islands)</option>
                <option value="en_ZA">English (South Africa)</option>
                <option value="en_SS">English (South Sudan)</option>
                <option value="en_SH">English (St. Helena)</option>
                <option value="en_KN">English (St. Kitts &amp; Nevis)</option>
                <option value="en_LC">English (St. Lucia)</option>
                <option value="en_VC">English (St. Vincent &amp; Grenadines)</option>
                <option value="en_SD">English (Sudan)</option>
                <option value="en_SE">English (Sweden)</option>
                <option value="en_CH">English (Switzerland)</option>
                <option value="en_TZ">English (Tanzania)</option>
                <option value="en_TK">English (Tokelau)</option>
                <option value="en_TO">English (Tonga)</option>
                <option value="en_TT">English (Trinidad &amp; Tobago)</option>
                <option value="en_TC">English (Turks &amp; Caicos Islands)</option>
                <option value="en_TV">English (Tuvalu)</option>
                <option value="en_UM">English (U.S. Outlying Islands)</option>
                <option value="en_VI">English (U.S. Virgin Islands)</option>
                <option value="en_UG">English (Uganda)</option>
                <option value="en_AE">English (United Arab Emirates)</option>
                <option value="en_GB">English (United Kingdom)</option>
                <option value="en_US">English (United States)</option>
                <option value="en_VU">English (Vanuatu)</option>
                <option value="en_001">English (World)</option>
                <option value="en_ZM">English (Zambia)</option>
                <option value="en_ZW">English (Zimbabwe)</option>
                <option value="eo">Esperanto</option>
                <option value="eo_001">Esperanto (World)</option>
                <option value="et">Estonian</option>
                <option value="et_EE">Estonian (Estonia)</option>
                <option value="ee">Ewe</option>
                <option value="ee_GH">Ewe (Ghana)</option>
                <option value="ee_TG">Ewe (Togo)</option>
                <option value="ewo">Ewondo</option>
                <option value="ewo_CM">Ewondo (Cameroon)</option>
                <option value="fo">Faroese</option>
                <option value="fo_DK">Faroese (Denmark)</option>
                <option value="fo_FO">Faroese (Faroe Islands)</option>
                <option value="fil">Filipino</option>
                <option value="fil_PH">Filipino (Philippines)</option>
                <option value="fi">Finnish</option>
                <option value="fi_FI">Finnish (Finland)</option>
                <option value="fr">French</option>
                <option value="fr_DZ">French (Algeria)</option>
                <option value="fr_BE">French (Belgium)</option>
                <option value="fr_BJ">French (Benin)</option>
                <option value="fr_BF">French (Burkina Faso)</option>
                <option value="fr_BI">French (Burundi)</option>
                <option value="fr_CM">French (Cameroon)</option>
                <option value="fr_CA">French (Canada)</option>
                <option value="fr_CF">French (Central African Republic)</option>
                <option value="fr_TD">French (Chad)</option>
                <option value="fr_KM">French (Comoros)</option>
                <option value="fr_CG">French (Congo - Brazzaville)</option>
                <option value="fr_CD">French (Congo - Kinshasa)</option>
                <option value="fr_CI">French (Côte d’Ivoire)</option>
                <option value="fr_DJ">French (Djibouti)</option>
                <option value="fr_GQ">French (Equatorial Guinea)</option>
                <option value="fr_FR">French (France)</option>
                <option value="fr_GF">French (French Guiana)</option>
                <option value="fr_PF">French (French Polynesia)</option>
                <option value="fr_GA">French (Gabon)</option>
                <option value="fr_GP">French (Guadeloupe)</option>
                <option value="fr_GN">French (Guinea)</option>
                <option value="fr_HT">French (Haiti)</option>
                <option value="fr_LU">French (Luxembourg)</option>
                <option value="fr_MG">French (Madagascar)</option>
                <option value="fr_ML">French (Mali)</option>
                <option value="fr_MQ">French (Martinique)</option>
                <option value="fr_MR">French (Mauritania)</option>
                <option value="fr_MU">French (Mauritius)</option>
                <option value="fr_YT">French (Mayotte)</option>
                <option value="fr_MC">French (Monaco)</option>
                <option value="fr_MA">French (Morocco)</option>
                <option value="fr_NC">French (New Caledonia)</option>
                <option value="fr_NE">French (Niger)</option>
                <option value="fr_RE">French (Réunion)</option>
                <option value="fr_RW">French (Rwanda)</option>
                <option value="fr_SN">French (Senegal)</option>
                <option value="fr_SC">French (Seychelles)</option>
                <option value="fr_BL">French (St. Barthélemy)</option>
                <option value="fr_MF">French (St. Martin)</option>
                <option value="fr_PM">French (St. Pierre &amp; Miquelon)</option>
                <option value="fr_CH">French (Switzerland)</option>
                <option value="fr_SY">French (Syria)</option>
                <option value="fr_TG">French (Togo)</option>
                <option value="fr_TN">French (Tunisia)</option>
                <option value="fr_VU">French (Vanuatu)</option>
                <option value="fr_WF">French (Wallis &amp; Futuna)</option>
                <option value="fur">Friulian</option>
                <option value="fur_IT">Friulian (Italy)</option>
                <option value="ff">Fulah</option>
                <option value="ff_Latn_BF">Fulah (Latin, Burkina Faso)</option>
                <option value="ff_Latn_CM">Fulah (Latin, Cameroon)</option>
                <option value="ff_Latn_GM">Fulah (Latin, Gambia)</option>
                <option value="ff_Latn_GH">Fulah (Latin, Ghana)</option>
                <option value="ff_Latn_GW">Fulah (Latin, Guinea-Bissau)</option>
                <option value="ff_Latn_GN">Fulah (Latin, Guinea)</option>
                <option value="ff_Latn_LR">Fulah (Latin, Liberia)</option>
                <option value="ff_Latn_MR">Fulah (Latin, Mauritania)</option>
                <option value="ff_Latn_NE">Fulah (Latin, Niger)</option>
                <option value="ff_Latn_NG">Fulah (Latin, Nigeria)</option>
                <option value="ff_Latn_SN">Fulah (Latin, Senegal)</option>
                <option value="ff_Latn_SL">Fulah (Latin, Sierra Leone)</option>
                <option value="ff_Latn">Fulah (Latin)</option>
                <option value="gl">Galician</option>
                <option value="gl_ES">Galician (Spain)</option>
                <option value="lg">Ganda</option>
                <option value="lg_UG">Ganda (Uganda)</option>
                <option value="ka">Georgian</option>
                <option value="ka_GE">Georgian (Georgia)</option>
                <option value="de">German</option>
                <option value="de_AT">German (Austria)</option>
                <option value="de_BE">German (Belgium)</option>
                <option value="de_DE">German (Germany)</option>
                <option value="de_IT">German (Italy)</option>
                <option value="de_LI">German (Liechtenstein)</option>
                <option value="de_LU">German (Luxembourg)</option>
                <option value="de_CH">German (Switzerland)</option>
                <option value="el">Greek</option>
                <option value="el_CY">Greek (Cyprus)</option>
                <option value="el_GR">Greek (Greece)</option>
                <option value="gu">Gujarati</option>
                <option value="gu_IN">Gujarati (India)</option>
                <option value="guz">Gusii</option>
                <option value="guz_KE">Gusii (Kenya)</option>
                <option value="ha">Hausa</option>
                <option value="ha_GH">Hausa (Ghana)</option>
                <option value="ha_NE">Hausa (Niger)</option>
                <option value="ha_NG">Hausa (Nigeria)</option>
                <option value="haw">Hawaiian</option>
                <option value="haw_US">Hawaiian (United States)</option>
                <option value="he">Hebrew</option>
                <option value="he_IL">Hebrew (Israel)</option>
                <option value="hi">Hindi</option>
                <option value="hi_IN">Hindi (India)</option>
                <option value="hu">Hungarian</option>
                <option value="hu_HU">Hungarian (Hungary)</option>
                <option value="is">Icelandic</option>
                <option value="is_IS">Icelandic (Iceland)</option>
                <option value="ig">Igbo</option>
                <option value="ig_NG">Igbo (Nigeria)</option>
                <option value="smn">Inari Sami</option>
                <option value="smn_FI">Inari Sami (Finland)</option>
                <option value="id">Indonesian</option>
                <option value="id_ID">Indonesian (Indonesia)</option>
                <option value="ia">Interlingua</option>
                <option value="ia_001">Interlingua (World)</option>
                <option value="ga">Irish</option>
                <option value="ga_IE">Irish (Ireland)</option>
                <option value="ga_GB">Irish (United Kingdom)</option>
                <option value="it">Italian</option>
                <option value="it_IT">Italian (Italy)</option>
                <option value="it_SM">Italian (San Marino)</option>
                <option value="it_CH">Italian (Switzerland)</option>
                <option value="it_VA">Italian (Vatican City)</option>
                <option value="ja">Japanese</option>
                <option value="ja_JP">Japanese (Japan)</option>
                <option value="jv">Javanese</option>
                <option value="jv_ID">Javanese (Indonesia)</option>
                <option value="dyo">Jola-Fonyi</option>
                <option value="dyo_SN">Jola-Fonyi (Senegal)</option>
                <option value="kea">Kabuverdianu</option>
                <option value="kea_CV">Kabuverdianu (Cape Verde)</option>
                <option value="kab">Kabyle</option>
                <option value="kab_DZ">Kabyle (Algeria)</option>
                <option value="kkj">Kako</option>
                <option value="kkj_CM">Kako (Cameroon)</option>
                <option value="kl">Kalaallisut</option>
                <option value="kl_GL">Kalaallisut (Greenland)</option>
                <option value="kln">Kalenjin</option>
                <option value="kln_KE">Kalenjin (Kenya)</option>
                <option value="kam">Kamba</option>
                <option value="kam_KE">Kamba (Kenya)</option>
                <option value="kn">Kannada</option>
                <option value="kn_IN">Kannada (India)</option>
                <option value="ks">Kashmiri</option>
                <option value="ks_IN">Kashmiri (India)</option>
                <option value="kk">Kazakh</option>
                <option value="kk_KZ">Kazakh (Kazakhstan)</option>
                <option value="km">Khmer</option>
                <option value="km_KH">Khmer (Cambodia)</option>
                <option value="ki">Kikuyu</option>
                <option value="ki_KE">Kikuyu (Kenya)</option>
                <option value="rw">Kinyarwanda</option>
                <option value="rw_RW">Kinyarwanda (Rwanda)</option>
                <option value="kok">Konkani</option>
                <option value="kok_IN">Konkani (India)</option>
                <option value="ko">Korean</option>
                <option value="ko_KP">Korean (North Korea)</option>
                <option value="ko_KR">Korean (South Korea)</option>
                <option value="khq">Koyra Chiini</option>
                <option value="khq_ML">Koyra Chiini (Mali)</option>
                <option value="ses">Koyraboro Senni</option>
                <option value="ses_ML">Koyraboro Senni (Mali)</option>
                <option value="ku">Kurdish</option>
                <option value="ku_TR">Kurdish (Turkey)</option>
                <option value="nmg">Kwasio</option>
                <option value="nmg_CM">Kwasio (Cameroon)</option>
                <option value="ky">Kyrgyz</option>
                <option value="ky_KG">Kyrgyz (Kyrgyzstan)</option>
                <option value="lkt">Lakota</option>
                <option value="lkt_US">Lakota (United States)</option>
                <option value="lag">Langi</option>
                <option value="lag_TZ">Langi (Tanzania)</option>
                <option value="lo">Lao</option>
                <option value="lo_LA">Lao (Laos)</option>
                <option value="la">Latin</option>
                <option value="lv">Latvian</option>
                <option value="lv_LV">Latvian (Latvia)</option>
                <option value="ln">Lingala</option>
                <option value="ln_AO">Lingala (Angola)</option>
                <option value="ln_CF">Lingala (Central African Republic)</option>
                <option value="ln_CG">Lingala (Congo - Brazzaville)</option>
                <option value="ln_CD">Lingala (Congo - Kinshasa)</option>
                <option value="lt">Lithuanian</option>
                <option value="lt_LT">Lithuanian (Lithuania)</option>
                <option value="nds">Low German</option>
                <option value="nds_DE">Low German (Germany)</option>
                <option value="nds_NL">Low German (Netherlands)</option>
                <option value="dsb">Lower Sorbian</option>
                <option value="dsb_DE">Lower Sorbian (Germany)</option>
                <option value="lu">Luba-Katanga</option>
                <option value="lu_CD">Luba-Katanga (Congo - Kinshasa)</option>
                <option value="luo">Luo</option>
                <option value="luo_KE">Luo (Kenya)</option>
                <option value="lb">Luxembourgish</option>
                <option value="lb_LU">Luxembourgish (Luxembourg)</option>
                <option value="luy">Luyia</option>
                <option value="luy_KE">Luyia (Kenya)</option>
                <option value="mk">Macedonian</option>
                <option value="mk_MK">Macedonian (North Macedonia)</option>
                <option value="jmc">Machame</option>
                <option value="jmc_TZ">Machame (Tanzania)</option>
                <option value="mgh">Makhuwa-Meetto</option>
                <option value="mgh_MZ">Makhuwa-Meetto (Mozambique)</option>
                <option value="kde">Makonde</option>
                <option value="kde_TZ">Makonde (Tanzania)</option>
                <option value="mg">Malagasy</option>
                <option value="mg_MG">Malagasy (Madagascar)</option>
                <option value="ms">Malay</option>
                <option value="ms_BN">Malay (Brunei)</option>
                <option value="ms_MY">Malay (Malaysia)</option>
                <option value="ms_SG">Malay (Singapore)</option>
                <option value="ml">Malayalam</option>
                <option value="ml_IN">Malayalam (India)</option>
                <option value="mt">Maltese</option>
                <option value="mt_MT">Maltese (Malta)</option>
                <option value="gv">Manx</option>
                <option value="gv_IM">Manx (Isle of Man)</option>
                <option value="mi">Maori</option>
                <option value="mi_NZ">Maori (New Zealand)</option>
                <option value="mr">Marathi</option>
                <option value="mr_IN">Marathi (India)</option>
                <option value="mas">Masai</option>
                <option value="mas_KE">Masai (Kenya)</option>
                <option value="mas_TZ">Masai (Tanzania)</option>
                <option value="mzn">Mazanderani</option>
                <option value="mzn_IR">Mazanderani (Iran)</option>
                <option value="mer">Meru</option>
                <option value="mer_KE">Meru (Kenya)</option>
                <option value="mgo">Metaʼ</option>
                <option value="mgo_CM">Metaʼ (Cameroon)</option>
                <option value="mn">Mongolian</option>
                <option value="mn_MN">Mongolian (Mongolia)</option>
                <option value="mfe">Morisyen</option>
                <option value="mfe_MU">Morisyen (Mauritius)</option>
                <option value="mua">Mundang</option>
                <option value="mua_CM">Mundang (Cameroon)</option>
                <option value="naq">Nama</option>
                <option value="naq_NA">Nama (Namibia)</option>
                <option value="ne">Nepali</option>
                <option value="ne_IN">Nepali (India)</option>
                <option value="ne_NP">Nepali (Nepal)</option>
                <option value="nnh">Ngiemboon</option>
                <option value="nnh_CM">Ngiemboon (Cameroon)</option>
                <option value="jgo">Ngomba</option>
                <option value="jgo_CM">Ngomba (Cameroon)</option>
                <option value="nd">North Ndebele</option>
                <option value="nd_ZW">North Ndebele (Zimbabwe)</option>
                <option value="lrc">Northern Luri</option>
                <option value="lrc_IR">Northern Luri (Iran)</option>
                <option value="lrc_IQ">Northern Luri (Iraq)</option>
                <option value="se">Northern Sami</option>
                <option value="se_FI">Northern Sami (Finland)</option>
                <option value="se_NO">Northern Sami (Norway)</option>
                <option value="se_SE">Northern Sami (Sweden)</option>
                <option value="nb">Norwegian Bokmål</option>
                <option value="nb_NO">Norwegian Bokmål (Norway)</option>
                <option value="nb_SJ">Norwegian Bokmål (Svalbard &amp; Jan Mayen)</option>
                <option value="nn">Norwegian Nynorsk</option>
                <option value="nn_NO">Norwegian Nynorsk (Norway)</option>
                <option value="nus">Nuer</option>
                <option value="nus_SS">Nuer (South Sudan)</option>
                <option value="nyn">Nyankole</option>
                <option value="nyn_UG">Nyankole (Uganda)</option>
                <option value="or">Odia</option>
                <option value="or_IN">Odia (India)</option>
                <option value="om">Oromo</option>
                <option value="om_ET">Oromo (Ethiopia)</option>
                <option value="om_KE">Oromo (Kenya)</option>
                <option value="os">Ossetic</option>
                <option value="os_GE">Ossetic (Georgia)</option>
                <option value="os_RU">Ossetic (Russia)</option>
                <option value="ps">Pashto</option>
                <option value="ps_AF">Pashto (Afghanistan)</option>
                <option value="ps_PK">Pashto (Pakistan)</option>
                <option value="fa">Persian</option>
                <option value="fa_AF">Persian (Afghanistan)</option>
                <option value="fa_IR">Persian (Iran)</option>
                <option value="pl">Polish</option>
                <option value="pl_PL">Polish (Poland)</option>
                <option value="pt">Portuguese</option>
                <option value="pt_AO">Portuguese (Angola)</option>
                <option value="pt_BR">Portuguese (Brazil)</option>
                <option value="pt_CV">Portuguese (Cape Verde)</option>
                <option value="pt_GQ">Portuguese (Equatorial Guinea)</option>
                <option value="pt_GW">Portuguese (Guinea-Bissau)</option>
                <option value="pt_LU">Portuguese (Luxembourg)</option>
                <option value="pt_MO">Portuguese (Macao SAR China)</option>
                <option value="pt_MZ">Portuguese (Mozambique)</option>
                <option value="pt_PT">Portuguese (Portugal)</option>
                <option value="pt_ST">Portuguese (São Tomé &amp; Príncipe)</option>
                <option value="pt_CH">Portuguese (Switzerland)</option>
                <option value="pt_TL">Portuguese (Timor-Leste)</option>
                <option value="pa">Punjabi</option>
                <option value="pa_Arab_PK">Punjabi (Arabic, Pakistan)</option>
                <option value="pa_Arab">Punjabi (Arabic)</option>
                <option value="pa_Guru_IN">Punjabi (Gurmukhi, India)</option>
                <option value="pa_Guru">Punjabi (Gurmukhi)</option>
                <option value="qu">Quechua</option>
                <option value="qu_BO">Quechua (Bolivia)</option>
                <option value="qu_EC">Quechua (Ecuador)</option>
                <option value="qu_PE">Quechua (Peru)</option>
                <option value="ro">Romanian</option>
                <option value="ro_MD">Romanian (Moldova)</option>
                <option value="ro_RO">Romanian (Romania)</option>
                <option value="rm">Romansh</option>
                <option value="rm_CH">Romansh (Switzerland)</option>
                <option value="rof">Rombo</option>
                <option value="rof_TZ">Rombo (Tanzania)</option>
                <option value="rn">Rundi</option>
                <option value="rn_BI">Rundi (Burundi)</option>
                <option value="ru">Russian</option>
                <option value="ru_BY">Russian (Belarus)</option>
                <option value="ru_KZ">Russian (Kazakhstan)</option>
                <option value="ru_KG">Russian (Kyrgyzstan)</option>
                <option value="ru_MD">Russian (Moldova)</option>
                <option value="ru_RU">Russian (Russia)</option>
                <option value="ru_UA">Russian (Ukraine)</option>
                <option value="rwk">Rwa</option>
                <option value="rwk_TZ">Rwa (Tanzania)</option>
                <option value="sah">Sakha</option>
                <option value="sah_RU">Sakha (Russia)</option>
                <option value="saq">Samburu</option>
                <option value="saq_KE">Samburu (Kenya)</option>
                <option value="sg">Sango</option>
                <option value="sg_CF">Sango (Central African Republic)</option>
                <option value="sbp">Sangu</option>
                <option value="sbp_TZ">Sangu (Tanzania)</option>
                <option value="gd">Scottish Gaelic</option>
                <option value="gd_GB">Scottish Gaelic (United Kingdom)</option>
                <option value="seh">Sena</option>
                <option value="seh_MZ">Sena (Mozambique)</option>
                <option value="sr">Serbian</option>
                <option value="sr_Cyrl_BA">Serbian (Cyrillic, Bosnia &amp; Herzegovina)</option>
                <option value="sr_Cyrl_XK">Serbian (Cyrillic, Kosovo)</option>
                <option value="sr_Cyrl_ME">Serbian (Cyrillic, Montenegro)</option>
                <option value="sr_Cyrl_RS">Serbian (Cyrillic, Serbia)</option>
                <option value="sr_Cyrl">Serbian (Cyrillic)</option>
                <option value="sr_Latn_BA">Serbian (Latin, Bosnia &amp; Herzegovina)</option>
                <option value="sr_Latn_XK">Serbian (Latin, Kosovo)</option>
                <option value="sr_Latn_ME">Serbian (Latin, Montenegro)</option>
                <option value="sr_Latn_RS">Serbian (Latin, Serbia)</option>
                <option value="sr_Latn">Serbian (Latin)</option>
                <option value="ksb">Shambala</option>
                <option value="ksb_TZ">Shambala (Tanzania)</option>
                <option value="sn">Shona</option>
                <option value="sn_ZW">Shona (Zimbabwe)</option>
                <option value="ii">Sichuan Yi</option>
                <option value="ii_CN">Sichuan Yi (China)</option>
                <option value="sd">Sindhi</option>
                <option value="sd_PK">Sindhi (Pakistan)</option>
                <option value="si">Sinhala</option>
                <option value="si_LK">Sinhala (Sri Lanka)</option>
                <option value="sk">Slovak</option>
                <option value="sk_SK">Slovak (Slovakia)</option>
                <option value="sl">Slovenian</option>
                <option value="sl_SI">Slovenian (Slovenia)</option>
                <option value="xog">Soga</option>
                <option value="xog_UG">Soga (Uganda)</option>
                <option value="so">Somali</option>
                <option value="so_DJ">Somali (Djibouti)</option>
                <option value="so_ET">Somali (Ethiopia)</option>
                <option value="so_KE">Somali (Kenya)</option>
                <option value="so_SO">Somali (Somalia)</option>
                <option value="es">Spanish</option>
                <option value="es_AR">Spanish (Argentina)</option>
                <option value="es_BZ">Spanish (Belize)</option>
                <option value="es_BO">Spanish (Bolivia)</option>
                <option value="es_BR">Spanish (Brazil)</option>
                <option value="es_IC">Spanish (Canary Islands)</option>
                <option value="es_EA">Spanish (Ceuta &amp; Melilla)</option>
                <option value="es_CL">Spanish (Chile)</option>
                <option value="es_CO">Spanish (Colombia)</option>
                <option value="es_CR">Spanish (Costa Rica)</option>
                <option value="es_CU">Spanish (Cuba)</option>
                <option value="es_DO">Spanish (Dominican Republic)</option>
                <option value="es_EC">Spanish (Ecuador)</option>
                <option value="es_SV">Spanish (El Salvador)</option>
                <option value="es_GQ">Spanish (Equatorial Guinea)</option>
                <option value="es_GT">Spanish (Guatemala)</option>
                <option value="es_HN">Spanish (Honduras)</option>
                <option value="es_419">Spanish (Latin America)</option>
                <option value="es_MX">Spanish (Mexico)</option>
                <option value="es_NI">Spanish (Nicaragua)</option>
                <option value="es_PA">Spanish (Panama)</option>
                <option value="es_PY">Spanish (Paraguay)</option>
                <option value="es_PE">Spanish (Peru)</option>
                <option value="es_PH">Spanish (Philippines)</option>
                <option value="es_PR">Spanish (Puerto Rico)</option>
                <option value="es_ES">Spanish (Spain)</option>
                <option value="es_US">Spanish (United States)</option>
                <option value="es_UY">Spanish (Uruguay)</option>
                <option value="es_VE">Spanish (Venezuela)</option>
                <option value="zgh">Standard Moroccan Tamazight</option>
                <option value="zgh_MA">Standard Moroccan Tamazight (Morocco)</option>
                <option value="sw">Swahili</option>
                <option value="sw_CD">Swahili (Congo - Kinshasa)</option>
                <option value="sw_KE">Swahili (Kenya)</option>
                <option value="sw_TZ">Swahili (Tanzania)</option>
                <option value="sw_UG">Swahili (Uganda)</option>
                <option value="sv">Swedish</option>
                <option value="sv_AX">Swedish (Åland Islands)</option>
                <option value="sv_FI">Swedish (Finland)</option>
                <option value="sv_SE">Swedish (Sweden)</option>
                <option value="gsw">Swiss German</option>
                <option value="gsw_FR">Swiss German (France)</option>
                <option value="gsw_LI">Swiss German (Liechtenstein)</option>
                <option value="gsw_CH">Swiss German (Switzerland)</option>
                <option value="shi">Tachelhit</option>
                <option value="shi_Latn_MA">Tachelhit (Latin, Morocco)</option>
                <option value="shi_Latn">Tachelhit (Latin)</option>
                <option value="shi_Tfng_MA">Tachelhit (Tifinagh, Morocco)</option>
                <option value="shi_Tfng">Tachelhit (Tifinagh)</option>
                <option value="dav">Taita</option>
                <option value="dav_KE">Taita (Kenya)</option>
                <option value="tg">Tajik</option>
                <option value="tg_TJ">Tajik (Tajikistan)</option>
                <option value="ta">Tamil</option>
                <option value="ta_IN">Tamil (India)</option>
                <option value="ta_MY">Tamil (Malaysia)</option>
                <option value="ta_SG">Tamil (Singapore)</option>
                <option value="ta_LK">Tamil (Sri Lanka)</option>
                <option value="twq">Tasawaq</option>
                <option value="twq_NE">Tasawaq (Niger)</option>
                <option value="tt">Tatar</option>
                <option value="tt_RU">Tatar (Russia)</option>
                <option value="te">Telugu</option>
                <option value="te_IN">Telugu (India)</option>
                <option value="teo">Teso</option>
                <option value="teo_KE">Teso (Kenya)</option>
                <option value="teo_UG">Teso (Uganda)</option>
                <option value="th">Thai</option>
                <option value="th_TH">Thai (Thailand)</option>
                <option value="bo">Tibetan</option>
                <option value="bo_CN">Tibetan (China)</option>
                <option value="bo_IN">Tibetan (India)</option>
                <option value="ti">Tigrinya</option>
                <option value="ti_ER">Tigrinya (Eritrea)</option>
                <option value="ti_ET">Tigrinya (Ethiopia)</option>
                <option value="to">Tongan</option>
                <option value="to_TO">Tongan (Tonga)</option>
                <option value="tr">Turkish</option>
                <option value="tr_CY">Turkish (Cyprus)</option>
                <option value="tr_TR">Turkish (Turkey)</option>
                <option value="tk">Turkmen</option>
                <option value="tk_TM">Turkmen (Turkmenistan)</option>
                <option value="uk">Ukrainian</option>
                <option value="uk_UA">Ukrainian (Ukraine)</option>
                <option value="hsb">Upper Sorbian</option>
                <option value="hsb_DE">Upper Sorbian (Germany)</option>
                <option value="ur">Urdu</option>
                <option value="ur_IN">Urdu (India)</option>
                <option value="ur_PK">Urdu (Pakistan)</option>
                <option value="ug">Uyghur</option>
                <option value="ug_CN">Uyghur (China)</option>
                <option value="uz">Uzbek</option>
                <option value="uz_Arab_AF">Uzbek (Arabic, Afghanistan)</option>
                <option value="uz_Arab">Uzbek (Arabic)</option>
                <option value="uz_Cyrl_UZ">Uzbek (Cyrillic, Uzbekistan)</option>
                <option value="uz_Cyrl">Uzbek (Cyrillic)</option>
                <option value="uz_Latn_UZ">Uzbek (Latin, Uzbekistan)</option>
                <option value="uz_Latn">Uzbek (Latin)</option>
                <option value="vai">Vai</option>
                <option value="vai_Latn_LR">Vai (Latin, Liberia)</option>
                <option value="vai_Latn">Vai (Latin)</option>
                <option value="vai_Vaii_LR">Vai (Vai, Liberia)</option>
                <option value="vai_Vaii">Vai (Vai)</option>
                <option value="vi">Vietnamese</option>
                <option value="vi_VN">Vietnamese (Vietnam)</option>
                <option value="vun">Vunjo</option>
                <option value="vun_TZ">Vunjo (Tanzania)</option>
                <option value="wae">Walser</option>
                <option value="wae_CH">Walser (Switzerland)</option>
                <option value="cy">Welsh</option>
                <option value="cy_GB">Welsh (United Kingdom)</option>
                <option value="fy">Western Frisian</option>
                <option value="fy_NL">Western Frisian (Netherlands)</option>
                <option value="wo">Wolof</option>
                <option value="wo_SN">Wolof (Senegal)</option>
                <option value="xh">Xhosa</option>
                <option value="xh_ZA">Xhosa (South Africa)</option>
                <option value="yav">Yangben</option>
                <option value="yav_CM">Yangben (Cameroon)</option>
                <option value="yi">Yiddish</option>
                <option value="yi_001">Yiddish (World)</option>
                <option value="yo">Yoruba</option>
                <option value="yo_BJ">Yoruba (Benin)</option>
                <option value="yo_NG">Yoruba (Nigeria)</option>
                <option value="dje">Zarma</option>
                <option value="dje_NE">Zarma (Niger)</option>
                <option value="zu">Zulu</option>
                <option value="zu_ZA">Zulu (South Africa)</option>
                </select>`;
        let settingsDialog = `<div id="settingsWrapper"><form id="calSettingsForm"><table id="calSettings">
                <tr><td colspan="2"><label>${i18next.t('YEAR')}: </td><td colspan="2"><input type="number" name="year" id="year" min="1969" max="9999" value="${$Settings.year}" /></label></td></tr>
                <tr><td><label>LOCALE: </td><td>${$localesSelect}</label></td><td>${i18next.t('National-Calendar')}: </td><td>${$nationalCalendarSelect}</td></tr>
                <tr><td><label>${i18next.t('EPIPHANY')}: </td><td><select name="epiphany" id="epiphany"><option value="JAN6" ${($Settings.epiphany === "JAN6" ? " SELECTED" : "")}>${i18next.t('January-6')}</option><option value="SUNDAY_JAN2_JAN8" ${($Settings.epiphany === "SUNDAY_JAN2_JAN8" ? " SELECTED" : "")}>${i18next.t('Sun-Jan2-Jan8')}</option></select></label></td><td>${i18next.t('Diocesan-Calendar')}: </td><td><select id="diocesancalendar" name="diocesancalendar" ${($Settings.nationalcalendar == '' || $Settings.nationalcalendar == 'VATICAN' ) ? 'disabled' : ''}></select></td></tr>
                <tr><td><label>${i18next.t('ASCENSION')}: </td><td><select name="ascension" id="ascension"><option value="THURSDAY" ${($Settings.ascension === "THURSDAY" ? " SELECTED" : "")}>${i18next.t('Thursday')}</option><option value="SUNDAY" ${($Settings.ascension === "SUNDAY" ? " SELECTED" : "")}>${i18next.t('Sunday')}</option></select></label></td><td></td><td></td></tr>
                <tr><td><label>CORPUS CHRISTI: </td><td><select name="corpusChristi" id="corpusChristi"><option value="THURSDAY" ${($Settings.corpusChristi === "THURSDAY" ? " SELECTED" : "")}>${i18next.t('Thursday')}</option><option value="SUNDAY" ${($Settings.corpusChristi === "SUNDAY" ? " SELECTED" : "")}>${i18next.t('Sunday')}</option></select></label></td><td></td><td></td></tr>
                <tr><td colspan="4" style="text-align:center;"><input type="submit" id="generateLitCal" value="${i18next.t("Generate-Roman-Calendar")}" /></td></tr>
                </table></form></div>`;
        return { header: header, tbheader: tbheader, settingsDialog: settingsDialog };
    },
    createHeader = () => {
        document.title = i18next.t("Generate-Roman-Calendar");
        $('#settingsWrapper').dialog("destroy").remove();
        $('header').empty();
        let { header, tbheader, settingsDialog } = buildHeaderAndDialog();
        $('header').html(header);
        $('#LitCalTable thead').html(tbheader);

        $(settingsDialog).dialog({
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
            open: () => {
                console.log('settings dialog was opened');
                console.log( $Settings );
                $('#locale').val( $Settings.locale );
                if( $Settings.hasOwnProperty( 'nationalcalendar' ) === false || $Settings.nationalcalendar === '' ) {
                    $('#calSettingsForm :input').prop('disabled', false);
                } else {
                    $('#calSettingsForm :input').not('#nationalcalendar').not('#year').not('#generateLitCal').prop('disabled', true);
                }
            },
            autoOpen: false
        });

        handleDiocesesList();
    },
    handleDiocesesList = val => {
        $('#diocesancalendar').empty();
        if( val === "VATICAN" || val === "" ) {
            $('#diocesancalendar').prop('disabled', true);
        } else {
            let $DiocesesList;
            if(Object.keys($index.DiocesanCalendars).length > 0){
                $DiocesesList = Object.filter($index.DiocesanCalendars, key => key.nation === val);
            }
            if(Object.keys($DiocesesList).length > 0) {
                $('#diocesancalendar').prop('disabled', false);
                $('#diocesancalendar').append('<option value="">---</option>');
                for(const [key, value] of Object.entries($DiocesesList)){
                    $('#diocesancalendar').append('<option value="' + key + '">' + value.diocese + '</option>');
                }
            } else {
                $('#diocesancalendar').prop('disabled', true);
            }
        }
    };

$(document).on('click', '#openSettings', () => {
    $('#settingsWrapper').dialog("open");
});

$(document).on("submit", "#calSettingsForm", event => {
    event.preventDefault();
    let formValues = $(event.currentTarget).serializeArray();
    for(const obj of formValues){
        $Settings[obj.name] = obj.value;
    }

    i18next.changeLanguage($Settings.locale.split('_')[0] , () => { //err, t
        jqueryI18next.init(i18next, $);
        Cookies.set("currentLocale", $Settings.locale );
    });

    console.log('$Settings = ');
    console.log($Settings);

    $('#settingsWrapper').dialog("close");
    genLitCal();
    return false;
});

$(document).on('change','#nationalcalendar', ev => {
    const currentSelectedNation = $(ev.currentTarget).val();
    $Settings.nationalcalendar = currentSelectedNation;
    let nationalCalSettingLocale = $index.NationalCalendarsMetadata[currentSelectedNation].settings.Locale;
    switch( currentSelectedNation ) {
        case "VATICAN":
            $Settings.locale = 'la';
            $Settings.epiphany = 'JAN6';
            $Settings.ascension = 'THURSDAY';
            $Settings.corpusChristi = 'THURSDAY';
            $Settings.diocesancalendar = '';
            $('#locale').val($Settings.locale);
            $('#epiphany').val($Settings.epiphany);
            $('#ascension').val($Settings.ascension);
            $('#corpusChristi').val($Settings.corpusChristi);
            $('#diocesancalendar').val($Settings.diocesancalendar);

            $('#calSettingsForm :input').not('#nationalcalendar').not('#year').not('#generateLitCal').prop('disabled', true);
            break;
        case "":
            $('#calSettingsForm :input').prop('disabled', false);
            break;
        default:
            $Settings.locale        = nationalCalSettingLocale.includes('_') ? nationalCalSettingLocale : nationalCalSettingLocale.toLowerCase();
            $Settings.epiphany      = $index.NationalCalendarsMetadata[currentSelectedNation].settings.Epiphany;
            $Settings.ascension     = $index.NationalCalendarsMetadata[currentSelectedNation].settings.Ascension;
            $Settings.corpusChristi = $index.NationalCalendarsMetadata[currentSelectedNation].settings.CorpusChristi;
            $('#locale').val($Settings.locale);
            $('#epiphany').val($Settings.epiphany);
            $('#ascension').val($Settings.ascension);
            $('#corpusChristi').val($Settings.corpusChristi);
            $('#calSettingsForm :input').not('#nationalcalendar').not('#year').not('#generateLitCal').prop('disabled', true);
    }
    handleDiocesesList( currentSelectedNation );

});

$(document).on('change', '#diocesancalendar', ev => {
    $Settings.diocesancalendar = $(ev.currentTarget).val();
});


Object.filter = (obj, predicate) => 
    Object.keys(obj)
      .filter( key => predicate(obj[key]) )
      .reduce( (res, key) => (res[key] = obj[key], res), {} );

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

        jQuery.ajax({
            url: metadataURL,
            dataType: 'json',
            statusCode: {
                404: () => { console.log('The JSON definition "nations/index.json" does not exist yet.'); }
            },
            success: data => {
                console.log('retrieved data from index file:');
                console.log(data);
                $index = data.LitCalMetadata;
                createHeader();
                $('#settingsWrapper').dialog("open");
            }
        });
        $('#generateLitCal').button();
    
        if($('#nationalcalendar').val() !== "ITALY"){
            $('#diocesancalendar').prop('disabled',true);
        }

    });
});
