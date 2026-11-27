package com.ekl.core.job.blo;

import com.ekl.core.job.DocumentIndexJob.Source;
import com.ekl.core.job.DocumentOutboxJob;

public interface DocumentIndexBlo {
    void write(DocumentOutboxJob job, Source source);
}
