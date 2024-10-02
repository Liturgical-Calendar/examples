<?php

namespace LiturgicalCalendar\Examples\Php\Enums;

class LitLocale
{
    public const LATIN                  = "la_VA";
    public const LATIN_PRIMARY_LANGUAGE = "la";
    public static array $values         = [ "la", "la_VA" ];

    public static function isValid($value)
    {
        $AllAvailableLocales = array_filter(\ResourceBundle::getLocales(''), function ($value) {
            return strpos($value, 'POSIX') === false;
        });
        return in_array($value, self::$values) || in_array($value, $AllAvailableLocales);
    }
}
