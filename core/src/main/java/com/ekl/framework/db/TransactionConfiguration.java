package com.ekl.framework.db;

import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.transaction.annotation.RollbackOn;

@Configuration(proxyBeanMethods = false)
@EnableTransactionManagement(rollbackOn = RollbackOn.ALL_EXCEPTIONS)
public class TransactionConfiguration {
}
