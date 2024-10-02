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
    public array $color_lcl;
    public string $type;
    public int $grade;
    public string $grade_lcl;
    public string $display_grade;
    public array $common;
    public string $common_lcl;
    public string $liturgical_year;

    public function __construct(array $LitEvent)
    {
        $this->name           = $LitEvent['name'];
        $this->date           = \DateTime::createFromFormat('U', $LitEvent['date'], new \DateTimeZone('UTC'));
        $this->color          = $LitEvent['color'];
        $this->color_lcl      = $LitEvent['color_lcl'];
        $this->type           = $LitEvent['type'];
        $this->grade          = $LitEvent['grade'];
        $this->grade_lcl      = $LitEvent['grade_lcl'];
        $this->common         = $LitEvent['common'];
        $this->common_lcl     = $LitEvent['common_lcl'];
        $this->liturgical_year = $LitEvent['liturgical_year'] ?? '';
        $this->display_grade   = $LitEvent['display_grade'] ?? '';
    }
}
