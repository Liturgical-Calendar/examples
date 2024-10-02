<?php

namespace LiturgicalCalendar\Examples\Php\Enums;

class LitLocale
{
    public const LATIN                 = "la";
    public static array $values = [ "la" ];

    public static function isValid($value)
    {
        $AllAvailableLocales = array_filter(\ResourceBundle::getLocales(''), function ($value) {
            return strpos($value, 'POSIX') === false;
        });
        return in_array($value, self::$values) || in_array($value, $AllAvailableLocales);
    }
}
