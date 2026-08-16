package com.nur.quran.recitation;

public final class MaulanaLines {

    public static final String LISTENING = "میں سن رہا ہوں۔";
    public static final String KEEP_GOING = "چلتے رہو۔";
    public static final String GOOD = "شاباش۔ اگلی آیت پڑھو۔";
    public static final String TOO_FAST = "رکو۔ بہت تیز پڑھ رہے ہو۔ ٹھہر کر صاف صاف پڑھو۔";
    public static final String NO_HEAR = "رکو۔ آواز صاف نہیں آئی۔ دوبارہ پڑھو۔";
    public static final String EXTRA = "رکو۔ زیادہ الفاظ پڑھ دیے۔ صحیح آیت دوبارہ پڑھو۔";
    public static final String FINISH = "رکو۔ پوری آیت پوری کرو۔";
    public static final String EMPTY = "اس آیت میں لفظ نہیں ہیں۔";
    public static final String WRONG_AGAIN = "رکو۔ یہ لفظ غلط پڑھا۔ صحیح دوبارہ پڑھو۔";
    public static final String WRONG_PREFIX = "رکو۔ یہ لفظ غلط پڑھا۔ صحیح یہ ہے: ";
    public static final String PARA_DONE = "شاباش۔ یہ پارہ پورا ہو گیا۔";
    public static final String MIC = "رکو۔ کروم کھولو اور مائیکروفون کی اجازت دو۔";

    private MaulanaLines() {
    }

    public static String wrongWord(String arabic) {
        if (arabic == null || arabic.isBlank()) {
            return WRONG_AGAIN;
        }
        return WRONG_PREFIX + arabic.trim();
    }
}
