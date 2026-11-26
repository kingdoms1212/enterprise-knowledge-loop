package com.ekl.core.document;

import java.util.List;

public record LibraryPage<T>(List<T> items, String nextCursor) {
    public LibraryPage {
        items = List.copyOf(items);
    }
}
