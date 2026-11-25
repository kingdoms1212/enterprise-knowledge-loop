package com.ekl.framework.logging;

import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.util.concurrent.TimeUnit;

import org.aopalliance.intercept.MethodInterceptor;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.aop.Advisor;
import org.springframework.aop.support.DefaultPointcutAdvisor;
import org.springframework.aop.support.StaticMethodMatcherPointcut;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Role;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.stereotype.Service;

@Configuration(proxyBeanMethods = false)
class ServiceLoggingConfiguration {
    private static final Logger LOG = LogManager.getLogger("com.ekl.framework.logging.service");

    @Bean
    @Role(BeanDefinition.ROLE_INFRASTRUCTURE)
    Advisor serviceInvocationLogging() {
        var pointcut = new StaticMethodMatcherPointcut() {
            @Override
            public boolean matches(Method method, Class<?> targetClass) {
                return Modifier.isPublic(method.getModifiers()) && method.getDeclaringClass() != Object.class;
            }
        };
        pointcut.setClassFilter(type -> type.getPackageName().startsWith("com.ekl.")
                && AnnotatedElementUtils.hasAnnotation(type, Service.class));

        MethodInterceptor interceptor = invocation -> {
            var service = invocation.getThis().getClass().getSimpleName();
            var method = invocation.getMethod().getName();
            var started = System.nanoTime();
            try {
                var result = invocation.proceed();
                LOG.info("service={} method={} outcome=SUCCESS duration_ms={}", service, method, elapsed(started));
                return result;
            } catch (Throwable failure) {
                LOG.warn("service={} method={} outcome=FAILURE duration_ms={} error_type={}",
                        service, method, elapsed(started), failure.getClass().getSimpleName());
                throw failure;
            }
        };
        var advisor = new DefaultPointcutAdvisor(pointcut, interceptor);
        advisor.setOrder(Ordered.LOWEST_PRECEDENCE - 1);
        return advisor;
    }

    private static long elapsed(long started) {
        return TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - started);
    }
}
