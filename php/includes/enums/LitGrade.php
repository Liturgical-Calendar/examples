<?php
/**
 *	DEFINE THE ORDER OF PRECEDENCE OF THE LITURGICAL DAYS AS INDICATED IN THE
 *  UNIVERSAL NORMS FOR THE LITURGICAL YEAR AND THE GENERAL ROMAN CALENDAR
 *  PROMULGATED BY THE MOTU PROPRIO "MYSTERII PASCHALIS" BY POPE PAUL VI ON FEBRUARY 14 1969
 *	https://w2.vatican.va/content/paul-vi/en/motu_proprio/documents/hf_p-vi_motu-proprio_19690214_mysterii-paschalis.html
 *  A COPY OF THE DOCUMENT IS INCLUDED ALONGSIDE THIS ENGINE, SEEING THAT THERE IS NO DIRECT ONLINE LINK TO THE ACTUAL NORMS
 */

/*****************************************************
 * DEFINE THE ORDER OF IMPORTANCE OF THE FESTIVITIES *
 ****************************************************/

class LitGrade {
// I.
    const HIGHER_SOLEMNITY  = 7;
    // HIGHER RANKING SOLEMNITIES, THAT HAVE PRECEDENCE OVER ALL OTHERS:
    // 1. EASTER TRIDUUM
    // 2. CHRISTMAS, EPIPHANY, ASCENSION, PENTECOST
    //    SUNDAYS OF ADVENT, LENT AND EASTER
    //    ASH WEDNESDAY
    //    DAYS OF THE HOLY WEEK, FROM MONDAY TO THURSDAY
    //    DAYS OF THE OCTAVE OF EASTER

    const SOLEMNITY         = 6;
    // 3. SOLEMNITIES OF THE LORD, OF THE BLESSED VIRGIN MARY, OF THE SAINTS LISTED IN THE GENERAL CALENDAR
    //    COMMEMORATION OF THE FAITHFUL DEPARTED
    // 4. PARTICULAR SOLEMNITIES:
    //      a) PATRON OF THE PLACE, OF THE COUNTRY OR OF THE CITY (CELEBRATION REQUIRED ALSO FOR RELIGIOUS COMMUNITIES);
    //      b) SOLEMNITY OF THE DEDICATION AND OF THE ANNIVERSARY OF THE DEDICATION OF A CHURCH
    //      c) SOLEMNITY OF THE TITLE OF A CHURCH
    //      d) SOLEMNITY OF THE TITLE OR OF THE FOUNDER OR OF THE MAIN PATRON OF AN ORDER OR OF A CONGREGATION

// II.
    const FEAST_LORD        = 5;
    // 5. FEASTS OF THE LORD LISTED IN THE GENERAL CALENDAR
    // 6. SUNDAYS OF CHRISTMAS AND OF ORDINARY TIME

    const FEAST             = 4;
    // 7. FEASTS OF THE BLESSED VIRGIN MARY AND OF THE SAINTS IN THE GENERAL CALENDAR
    // 8. PARTICULAR FEASTS:
    //      a) MAIN PATRON OF THE DIOCESE
    //      b) FEAST OF THE ANNIVERSARY OF THE DEDICATION OF THE CATHEDRAL
    //      c) FEAST OF THE MAIN PATRON OF THE REGION OR OF THE PROVINCE, OF THE NATION, OF A LARGER TERRITORY
    //      d) FEAST OF THE TITLE, OF THE FOUNDER, OF THE MAIN PATRON OF AN ORDER OR OF A CONGREGATION AND OF A RELIGIOUS PROVINCE
    //      e) OTHER PARTICULAR FEASTS OF SOME CHURCH
    //      f) OTHER FEASTS LISTED IN THE CALENDAR OF EACH DIOCESE, ORDER OR CONGREGATION
    // 9. WEEKDAYS OF ADVENT FROM THE 17th TO THE 24th OF DECEMBER
    //    DAYS OF THE OCTAVE OF CHRISTMAS
    //    WEEKDAYS OF LENT

// III.
    const MEMORIAL          = 3;
    // 10. MEMORIALS OF THE GENERAL CALENDAR
    // 11. PARTICULAR MEMORIALS:
    //      a) MEMORIALS OF THE SECONDARY PATRON OF A PLACE, OF A DIOCESE, OF A REGION OR A RELIGIOUS PROVINCE
    //      b) OTHER MEMORIALS LISTED IN THE CALENDAR OF EACH DIOCESE, ORDER OR CONGREGATION

    const MEMORIAL_OPT      = 2;
    // 12. OPTIONAL MEMORIALS, WHICH CAN HOWEVER BE OBSERVED IN DAYS INDICATED AT N. 9,
    //     ACCORDING TO THE NORMS DESCRIBED IN "PRINCIPLES AND NORMS" FOR THE LITURGY OF THE HOURS AND THE USE OF THE MISSAL

    const COMMEMORATION     = 1;
    //     SIMILARLY MEMORIALS CAN BE OBSERVED AS OPTIONAL MEMORIALS THAT SHOULD FALL DURING THE WEEKDAYS OF LENT

    const WEEKDAY           = 0;
    // 13. WEEKDAYS OF ADVENT UNTIL DECEMBER 16th
    //     WEEKDAYS OF CHRISTMAS, FROM JANUARY 2nd UNTIL THE SATURDAY AFTER EPIPHANY
    //     WEEKDAYS OF THE EASTER SEASON, FROM THE MONDAY AFTER THE OCTAVE OF EASTER UNTIL THE SATURDAY BEFORE PENTECOST
    //     WEEKDAYS OF ORDINARY TIME

    const tags = [
        self::WEEKDAY =>            ['<I>','</I>'],
        self::COMMEMORATION =>      ['<I>','</I>'],
        self::MEMORIAL_OPT =>       ['',''],
        self::MEMORIAL =>           ['',''],
        self::FEAST =>              ['',''],
        self::FEAST_LORD =>         ['<B>','</B>'],
        self::SOLEMNITY =>          ['<B>','</B>'],
        self::HIGHER_SOLEMNITY =>   ['<B><I>','</I></B>']
    ];

    const latinGrade = [
        self::WEEKDAY =>            'feria',
        self::COMMEMORATION =>      'Commemoratio',
        self::MEMORIAL_OPT =>       'Memoria ad libitum',
        self::MEMORIAL =>           'Memoria obligatoria',
        self::FEAST =>              'FESTUM',
        self::FEAST_LORD =>         'FESTUM DOMINI',
        self::SOLEMNITY =>          'SOLLEMNITAS',
        self::HIGHER_SOLEMNITY =>   'celebratio altioris ordinis quam sollemnitatis'
    ];

    private static function translateGrade( int $value ) {
        switch( $value ) {
            /**translators: liturgical rank. Keep lowercase  */
            case self::WEEKDAY:
                return _( "weekday" );
            /**translators: liturgical rank. Keep Capitalized  */
            case self::COMMEMORATION:
                return _( "Commemoration" );
            /**translators: liturgical rank. Keep Capitalized  */
            case self::MEMORIAL_OPT:
                return _( "Optional memorial" );
            /**translators: liturgical rank. Keep Capitalized  */
            case self::MEMORIAL:
                return _( "Memorial" );
            /**translators: liturgical rank. Keep UPPERCASE  */
            case self::FEAST:
                return _( "FEAST" );
            /**translators: liturgical rank. Keep UPPERCASE  */
            case self::FEAST_LORD:
                return _( "FEAST OF THE LORD" );
            /**translators: liturgical rank. Keep UPPERCASE  */
            case self::SOLEMNITY:
                return _( "SOLEMNITY" );
            /**translators: liturgical rank. Keep lowercase  */
            case self::HIGHER_SOLEMNITY:
                return _( "celebration with precedence over solemnities" );
        }
    }

    public static array $values = [ 0, 1, 2, 3, 4, 5, 6, 7 ];

    private string $locale;

    public function __construct( string $locale ) {
        $this->locale = $locale;
    }

    public static function isValid( int $value ) {
        return in_array( $value, self::$values );
    }

    public function i18n( int $value, bool $html = true ) {
        $tags = self::tags[ $value ];
        if( !self::isValid( $value ) ) {
            $value = self::WEEKDAY;
        }
        $grade = $this->locale === 'LA' ? self::latinGrade[ $value ] : self::translateGrade( $value );
        return $html ? $tags[0] . $grade . $tags[1] : $grade;
    }
}
