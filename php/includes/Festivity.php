<?php
/** 
 *  Class Festivity
 *  similar to the class used in the LitCal API engine,
 *  except that this class converts a PHP Timestamp to a DateTime object
 *  and does not implement JsonSerializeable or the comparator function
 **/
class Festivity {

    public string $name;
    public DateTime $date;
    public string|array $color;
    public string $type;
    public int $grade;
    public string $displayGrade;
    public string|array $common;
    public string $liturgicalYear;

    function __construct( $name, $date, $color, $type, $grade = 0, $common = [], $liturgicalYear = '', $displayGrade = '' ) {
        $this->name     = (string) $name;
        $this->date     = DateTime::createFromFormat('U', $date, new DateTimeZone('UTC'));
        $this->color    = is_string( $color ) ? explode( ',', $color ) : $color;
        $this->type     = (string) $type;
        $this->grade    = (int) $grade;
        $this->common   = is_string( $common ) ? explode( ',', $common ) : $common;
        $this->liturgicalYear = (string) $liturgicalYear;
        $this->displayGrade = (string) $displayGrade;
    }
}
