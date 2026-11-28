package com.ekl.core.distribution;

import com.ekl.core.distribution.service.DistributionDeliveryService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.stereotype.Component;

@Component
@EnableScheduling
@ConditionalOnProperty(name = "ekl.distribution.enabled", havingValue = "true", matchIfMissing = true)
class DistributionDeliveryScheduler {
    private final DistributionDeliveryService delivery;

    DistributionDeliveryScheduler(DistributionDeliveryService delivery) {
        this.delivery = delivery;
    }

    @Scheduled(fixedDelayString = "${ekl.distribution.poll-ms:2000}")
    void deliver() {
        delivery.deliverNext();
    }
}
