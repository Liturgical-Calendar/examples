<?php

namespace LiturgicalCalendar\Examples\Php;

/**
 *  Class Festivity
 *  similar to the class used in the LitCal API engine,
 *  except that this class converts a PHP Timestamp to a DateTime object
 *  and does not implement JsonSerializeable or the comparator function
 **/
class Festivity
{
    public string $name;
    public \DateTime $date;
    public array $color;
    public string $type;
    public int $grade;
    public string $displayGrade;
    public array $common;
    public string $liturgicalYear;

    public function __construct(string $name, int $date, array $color, string $type, int $grade = 0, array $common = [], string $liturgicalYear = '', string $displayGrade = '')
    {
        $this->name     = (string) $name;
        $this->date     = \DateTime::createFromFormat('U', $date, new \DateTimeZone('UTC'));
        $this->color    = $color;
        $this->type     = (string) $type;
        $this->grade    = (int) $grade;
        $this->common   = $common;
        $this->liturgicalYear = (string) $liturgicalYear;
        $this->displayGrade = (string) $displayGrade;
    }
}
