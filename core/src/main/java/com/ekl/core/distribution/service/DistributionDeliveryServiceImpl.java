package com.ekl.core.distribution.service;

import com.ekl.core.distribution.blo.DistributionDeliveryBlo;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class DistributionDeliveryServiceImpl implements DistributionDeliveryService {
    private final DistributionDeliveryBlo delivery;

    DistributionDeliveryServiceImpl(DistributionDeliveryBlo delivery) {
        this.delivery = delivery;
    }

    @Override
    @Transactional
    public boolean deliverNext() {
        return delivery.deliverNext();
    }
}
